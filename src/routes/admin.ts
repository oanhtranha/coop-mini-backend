import { Router, Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";
import { authenticateAdmin } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

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

// ===========================
// CREATE PRODUCT
// ===========================
router.post("/products", authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { code, name, description, imageUrl, originalPrice, salePrice } = req.body;

    if (!code || !name || !originalPrice) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingCode = await prisma.product.findUnique({ where: { code } });
    if (existingCode) {
      return res.status(400).json({ message: "Mã sản phẩm đã tồn tại" });
    }

    if (imageUrl && !imageUrl.startsWith("https://res.cloudinary.com/")) {
      return res.status(400).json({ message: "URL ảnh không hợp lệ" });
    }

    const product = await prisma.product.create({
      data: {
        code,
        name,
        description,
        image: imageUrl || null,
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
    res.status(500).json({ message: "Server error" });
  }
});

// ===========================
// UPDATE PRODUCT
// ===========================
router.put("/products/:id", authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const { code, name, description, imageUrl, originalPrice, salePrice } = req.body;

    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) return res.status(404).json({ message: "Product not found" });

    if (code && code !== existing.code) {
      const codeExists = await prisma.product.findUnique({ where: { code } });
      if (codeExists) return res.status(400).json({ message: "Mã sản phẩm đã tồn tại" });
    }

    if (imageUrl && !imageUrl.startsWith("https://res.cloudinary.com/")) {
      return res.status(400).json({ message: "URL ảnh không hợp lệ" });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        code: code ?? existing.code,
        name: name ?? existing.name,
        description: description ?? existing.description,
        image: imageUrl ?? existing.image,
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
router.delete("/products/:id", authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: "Product not found" });

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
