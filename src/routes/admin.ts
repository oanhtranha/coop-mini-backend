import { Router, Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";
import { authenticateAdmin } from "../middleware/auth";
import multer from "multer";
import cloudinary from "../utils/cloudinary";
import path from "path";
import { Readable } from "stream";

const prisma = new PrismaClient();
const router = Router();

// ===========================
// Multer setup for Vercel
// ===========================
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ===========================
// Helper: upload buffer to Cloudinary
// ===========================
const streamUpload = (buffer: Buffer, folder: string, filename: string) => {
  return new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: filename, transformation: [{ quality: "auto" }] },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    const readable = new Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
};

// ===========================
// GET ALL PRODUCTS
// ===========================
router.get("/products", authenticateAdmin, async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany();
    res.json({ products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===========================
// GET PRODUCT BY ID
// ===========================
router.get("/products/:id", authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===========================
// CREATE PRODUCT
// ===========================
router.post("/products", authenticateAdmin, upload.single("image"), async (req, res) => {
  try {
    const { code, name, description, originalPrice, salePrice } = req.body;

    if (!code || !name || !originalPrice) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Kiểm tra code trùng
    const existingCode = await prisma.product.findUnique({ where: { code } });
    if (existingCode) {
      return res.status(400).json({ message: "Mã sản phẩm đã tồn tại" });
    }

    let imageUrl: string | null = null;

    if (req.file && req.file.buffer) {
      try {
        const ext = path.extname(req.file.originalname);
        const nameOnly = path.basename(req.file.originalname, ext);
        const result = await streamUpload(req.file.buffer, "coopmini-products", `${Date.now()}-${nameOnly}`);
        imageUrl = result.secure_url;
      }  catch (uploadErr) {
    console.error("❌ Upload Cloudinary error:", uploadErr);
    return res.status(500).json({
      message: "Upload ảnh thất bại",
      error: uploadErr instanceof Error ? uploadErr.message : uploadErr,
    });
  }
    }

    const product = await prisma.product.create({
      data: {
        code,
        name,
        description,
        image: imageUrl,
        originalPrice: Number(originalPrice),
        salePrice: Number(salePrice) || 0,
        onSaleFlag:
          !!salePrice &&
          Number(salePrice) > 0 &&
          Number(salePrice) < Number(originalPrice),
      },
    });

    res.status(201).json({ product });
  } catch (err) {
    console.error("❌ Error creating product:", err);
    res.status(500).json({ message: err instanceof Error ? err.message : "Server error" });
  }
});

// ===========================
// UPDATE PRODUCT
// ===========================
router.put("/products/:id", authenticateAdmin, upload.single("image"), async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) return res.status(404).json({ message: "Product not found" });

    const { code, name, description, originalPrice, salePrice } = req.body;

    if (code && code !== existing.code) {
      const codeExists = await prisma.product.findUnique({ where: { code } });
      if (codeExists) return res.status(400).json({ message: "Mã sản phẩm đã tồn tại" });
    }

    let imageUrl = existing.image;

    if (req.file && req.file.buffer) {
      try {
        const ext = path.extname(req.file.originalname);
        const nameOnly = path.basename(req.file.originalname, ext);
        const result = await streamUpload(req.file.buffer, "coopmini-products", `${Date.now()}-${nameOnly}`);
        imageUrl = result.secure_url;

        // Xóa ảnh cũ
        if (existing.image?.includes("cloudinary.com")) {
          const publicId = existing.image.split("/").slice(-1)[0]?.split(".")[0];
          if (publicId) await cloudinary.uploader.destroy(`coopmini-products/${publicId}`);
        }
      } catch (uploadErr: any) {
        console.error("❌ Cloudinary upload error:", uploadErr);

        if (uploadErr?.http_code === 400 || uploadErr?.http_code === 413) {
          return res.status(400).json({ message: "Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn 2MB" });
        }

        return res.status(500).json({
          message: "Không thể upload ảnh lên Cloudinary",
          error: uploadErr.message || "Lỗi không xác định",
        });
      }
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        code: code ?? existing.code,
        name: name ?? existing.name,
        description: description ?? existing.description,
        image: imageUrl,
        originalPrice: originalPrice ? Number(originalPrice) : existing.originalPrice,
        salePrice: salePrice ? Number(salePrice) : existing.salePrice,
        onSaleFlag:
          (salePrice ? Number(salePrice) : existing.salePrice) > 0 &&
          (originalPrice ? Number(originalPrice) : existing.originalPrice) >
          (salePrice ? Number(salePrice) : existing.salePrice),
      },
    });

    res.json({ product: updated });
  } catch (err) {
    console.error("❌ Error updating product:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===========================
// DELETE PRODUCT
// ===========================
router.delete("/products/:id", authenticateAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.image && product.image.includes("cloudinary.com")) {
      const publicId = product.image.split("/").pop()?.split(".")[0];
      if (publicId) await cloudinary.uploader.destroy(`coopmini-products/${publicId}`);
    }

    await prisma.product.delete({ where: { id: productId } });
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===========================
// ORDER MANAGEMENT
// ===========================
router.get("/orders", authenticateAdmin, async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { id: true, username: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, code: true, onSaleFlag: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while fetching orders" });
  }
});

router.patch("/orders/:orderId/status", authenticateAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!["DELIVERING", "DONE", "CANCELLED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: { status },
    });

    res.json({ message: "Order status updated", order: updatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;


