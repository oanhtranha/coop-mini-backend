import { Router, Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";
import { authenticateAdmin } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

/**
 * Helper: Validate request body
 */
function validateBody(body: any, required: string[]) {
  if (!body || typeof body !== "object") {
    return "Request body is missing or invalid JSON format.";
  }

  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

// ===========================
// GET ALL PRODUCTS
// ===========================
router.get("/products", authenticateAdmin, async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany();
    res.json({ products });
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({ message: "Server error while fetching products" });
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
    console.error("❌ Error fetching product by ID:", err);
    res.status(500).json({ message: "Server error while fetching product" });
  }
});

// ===========================
// CREATE PRODUCT
// ===========================
router.post("/products", authenticateAdmin, async (req: Request, res: Response) => {
  try {
    // ✅ Check body exists
    if (!req.body) {
      return res.status(400).json({
        message: "Request body is missing. Make sure to send JSON with 'Content-Type: application/json'.",
      });
    }

    const { code, name, description, imageUrl, originalPrice, salePrice } = req.body;

    // ✅ Validate required fields
    const missing = validateBody(req.body, ["code", "name", "originalPrice"]);
    if (missing) {
      return res.status(400).json({ message: missing });
    }

    // ✅ Validate image URL format
    if (imageUrl && typeof imageUrl === "string" && !imageUrl.startsWith("https://res.cloudinary.com/")) {
      return res.status(400).json({ message: "Invalid image URL format" });
    }

    // ✅ Check duplicate code
    const existing = await prisma.product.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ message: "Product code already exists" });
    }

    // ✅ Create product
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
  } catch (err: any) {
    console.error("❌ Error creating product:", err);

    if (err instanceof SyntaxError) {
      // JSON parse error
      return res.status(400).json({ message: "Invalid JSON format in request body." });
    }

    res.status(500).json({
      message: "Internal server error while creating product",
      error: err.message || err,
    });
  }
});

// ===========================
// UPDATE PRODUCT
// ===========================
router.put("/products/:id", authenticateAdmin, async (req: Request, res: Response) => {
  try {
    if (!req.body) {
      return res.status(400).json({
        message: "Request body is missing. Make sure to send JSON with 'Content-Type: application/json'.",
      });
    }

    const productId = Number(req.params.id);
    const { code, name, description, imageUrl, originalPrice, salePrice } = req.body;

    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) return res.status(404).json({ message: "Product not found" });

    if (code && code !== existing.code) {
      const codeExists = await prisma.product.findUnique({ where: { code } });
      if (codeExists) return res.status(400).json({ message: "Product code already exists" });
    }

    if (imageUrl && typeof imageUrl === "string" && !imageUrl.startsWith("https://res.cloudinary.com/")) {
      return res.status(400).json({ message: "Invalid image URL format" });
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
  } catch (err: any) {
    console.error("❌ Error updating product:", err);

    if (err instanceof SyntaxError) {
      return res.status(400).json({ message: "Invalid JSON format in request body." });
    }

    res.status(500).json({
      message: "Internal server error while updating product",
      error: err.message || err,
    });
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
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    res.status(500).json({ message: "Server error while deleting product" });
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
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ message: "Server error while fetching orders" });
  }
});

router.patch("/orders/:orderId/status", authenticateAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Missing field: status" });
    }

    if (!["DELIVERING", "DONE", "CANCELLED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: { status },
    });

    res.json({ message: "Order status updated successfully", order: updatedOrder });
  } catch (error) {
    console.error("❌ Error updating order:", error);
    res.status(500).json({ message: "Server error while updating order" });
  }
});

export default router;
