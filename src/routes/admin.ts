import { Router, Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";
import { authenticateAdmin } from "../middleware/auth";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary, { upload } from "../utils/cloudinary";
import path from "path";

const prisma = new PrismaClient();
const router = Router();

// Multer setup
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, path.join(__dirname, "../../uploads")),
//   filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
// });
// const upload = multer({ storage });

// GET ALL PRODUCTS
router.get("/products", authenticateAdmin, async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany();
    res.json({ products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET PRODUCT BY ID
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

// CREATE PRODUCT
// router.post("/products", authenticateAdmin, upload.single("image"), async (req: Request, res: Response) => {
//   try {
//     const { code, name, description, originalPrice, salePrice } = req.body;
//     const image = req.file ? `/uploads/${req.file.filename}` : null;

//     const product = await prisma.product.create({
//       data: {
//         code,
//         name,
//         description,
//         image,
//         originalPrice: Number(originalPrice),
//         salePrice: Number(salePrice) || 0,
//         onSaleFlag: salePrice != null && Number(salePrice) > 0 && Number(salePrice) < Number(originalPrice),
//       },
//     });
//     res.status(201).json({ product });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// UPDATE PRODUCT
// router.put("/products/:id", authenticateAdmin, upload.single("image"), async (req: Request, res: Response) => {
//   try {
//     const existing = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
//     if (!existing) return res.status(404).json({ message: "Product not found" });

//     const { code, name, description, originalPrice, salePrice } = req.body;
//     const image = req.file ? `/uploads/${req.file.filename}` : existing.image;

//     const updated = await prisma.product.update({
//       where: { id: Number(req.params.id) },
//       data: {
//         code: code ?? existing.code,
//         name: name ?? existing.name,
//         description: description ?? existing.description,
//         image,
//         originalPrice: originalPrice ? Number(originalPrice) : existing.originalPrice,
//         salePrice: salePrice ? Number(salePrice) : existing.salePrice,
//         onSaleFlag:
//           (salePrice ? Number(salePrice) : existing.salePrice) > 0 &&
//           (originalPrice ? Number(originalPrice) : existing.originalPrice) >
//             (salePrice ? Number(salePrice) : existing.salePrice),
//       },
//     });
//     res.json({ product: updated });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });


// ===========================
// Product management
// ===========================
// CREATE PRODUCT
router.post("/products", authenticateAdmin, upload.single("image"), async (req, res) => {
  try {
    const { code, name, description, originalPrice, salePrice } = req.body;
    const imageUrl = (req.file as any)?.path ?? null;

    if (!code || !name || !originalPrice) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingCode = await prisma.product.findUnique({ where: { code } });
    if (existingCode) {
      return res.status(400).json({ message: "Product code already exists" });
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
    res.status(500).json({
      message: err instanceof Error ? err.message : "Server error",
    });
  }
});

// UPDATE PRODUCT
router.put("/products/:id", authenticateAdmin, upload.single("image"), async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    const { code, name, description, originalPrice, salePrice } = req.body;

    // Nếu có file mới thì upload Cloudinary
    let imageUrl = existing.image;
    if (req.file) {
      imageUrl = (req.file as any).path;
      // Nếu có ảnh cũ thì xóa trên Cloudinary (tuỳ chọn)
      if (existing.image && existing.image.includes("cloudinary.com")) {
        const publicId = existing.image.split("/").pop()?.split(".")[0];
        if (publicId) await cloudinary.uploader.destroy(`coop_mini_products/${publicId}`);
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
    res.status(500).json({
      message: err instanceof Error ? err.message : "Server error",
    });
  }
});

// DELETE PRODUCT
router.delete("/products/:id", authenticateAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.image && product.image.includes("cloudinary.com")) {
      const publicId = product.image.split("/").pop()?.split(".")[0];
      if (publicId) await cloudinary.uploader.destroy(`coop_mini_products/${publicId}`);
    }

    await prisma.product.delete({ where: { id: productId } });
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===========================
// Order management
// ===========================
// Get all orders
router.get("/orders", authenticateAdmin, async (req, res) => {
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

// Update order status
router.patch("/orders/:orderId/status", authenticateAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body; // DELIVERING / DONE

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