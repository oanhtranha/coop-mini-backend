import { Router, Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";
import { authenticateAdmin } from "../middleware/auth";
import { safeUpload } from "../middleware/safeUpload";
import cloudinary from "../utils/cloudinary";

const prisma = new PrismaClient();
const router = Router();


// ===========================
// PRODUCT MANAGEMENT
// ===========================

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
router.get("/products/:id", authenticateAdmin, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE PRODUCT
router.post("/products", authenticateAdmin, safeUpload("image"), async (req, res) => {
  try {
    const { code, name, description, originalPrice, salePrice } = req.body;

    if (!code || !name || !originalPrice) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    const existingCode = await prisma.product.findUnique({ where: { code } });
    if (existingCode) {
      return res.status(400).json({ message: "Mã sản phẩm đã tồn tại" });
    }

    const imageUrl = req.file ? (req.file as any).path || (req.file as any).url : null;

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
    res.status(500).json({ message: "Lỗi server khi tạo sản phẩm" });
  }
});

// UPDATE PRODUCT
router.put("/products/:id", authenticateAdmin, safeUpload("image"), async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    const { code, name, description, originalPrice, salePrice } = req.body;

    if (code && code !== existing.code) {
      const codeExists = await prisma.product.findUnique({ where: { code } });
      if (codeExists) return res.status(400).json({ message: "Mã sản phẩm đã tồn tại" });
    }

    let imageUrl = existing.image;
    if (req.file) {
      const uploaded = (req.file as any).path || (req.file as any).url;
      imageUrl = uploaded;

      // Xóa ảnh cũ trên Cloudinary
      if (existing.image?.includes("cloudinary.com")) {
        const publicId = existing.image.split("/").slice(-1)[0]?.split(".")[0];
        if (publicId) await cloudinary.uploader.destroy(`coopmini-products/${publicId}`);
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
    res.status(500).json({ message: "Lỗi server khi cập nhật sản phẩm" });
  }
});

// DELETE PRODUCT
router.delete("/products/:id", authenticateAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    if (product.image && product.image.includes("cloudinary.com")) {
      const publicId = product.image.split("/").pop()?.split(".")[0];
      if (publicId) await cloudinary.uploader.destroy(`coopmini-products/${publicId}`);
    }

    await prisma.product.delete({ where: { id: productId } });
    res.json({ message: "Đã xóa sản phẩm" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi xóa sản phẩm" });
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
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: { status },
    });

    res.json({ message: "Cập nhật trạng thái đơn hàng thành công", order: updatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
