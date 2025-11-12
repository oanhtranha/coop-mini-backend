import { Router } from "express";
import { PrismaClient } from "../../generated/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticateUser } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";

// ===========================
// Signup
// ===========================
router.post("/signup", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, username, password: hashedPassword } });

    res.status(201).json({ message: "Signup successful", userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
});

// ===========================
// Login
// ===========================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: "Email or password is incorrect" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: "Email or password is incorrect" });

    const token = jwt.sign({ userId: user.id, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: "7d" });
    res.json({
      message: "Login successful", token, user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
});

// ===========================
// Logout (client chỉ xóa token, backend optional)
// ===========================
router.post("/logout", authenticateUser, async (_req, res) => {
  // Token vẫn hợp lệ, logout chỉ xóa trên client
  res.json({ message: "Logout successful" });
});

// ===========================
// Get current user
// ===========================
router.get("/me", authenticateUser, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true }
    });
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
});

// ===========================
// Update user info
// ===========================
router.put("/me", authenticateUser, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { username, password } = req.body;

    const data: any = {};
    if (username) data.username = username;
    if (password) data.password = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, username: true }
    });

    res.json({ message: "Update Successfull!", user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
});

// ===========================
// Get all products for user
// ===========================
router.get("/products", authenticateUser, async (_req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json({ products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
});

// ===========================
// Cart management
// ===========================

// Add product to cart
router.post("/cart", authenticateUser, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ message: "ProductId and quantity are required" });
    }

    // Kiểm tra đã có cart item chưa
    const existing = await prisma.cart.findFirst({ where: { userId, productId } });
    if (existing) {
      const updated = await prisma.cart.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity }
      });
      return res.json({ message: "Update cart successful", cartItem: updated });
    }

    const cartItem = await prisma.cart.create({
      data: { userId, productId, quantity }
    });

    res.json({ message: "Add to cart successful", cartItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
});

// Remove product from cart
router.delete("/cart/:productId", authenticateUser, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const productId = Number(req.params.productId);

    await prisma.cart.deleteMany({ where: { userId, productId } });
    res.json({ message: "Remove product from cart successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
});
// Update product quantity in cart
router.put("/cart/:productId", authenticateUser, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const productId = Number(req.params.productId);
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "Quantity is required and must be greater than 0" });
    }

    // Cập nhật 1 cart item duy nhất
    // Update product quantity
    await prisma.cart.updateMany({
      where: { userId, productId },
      data: { quantity }
    });

    // Lấy cart item sau update
    const cartItem = await prisma.cart.findFirst({
      where: { userId, productId },
      include: { product: true },
    });

    res.json({
      message: "Update quantity successful",
      cartItem,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
});


// Get all cart items for user
router.get("/cart", authenticateUser, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: { product: true }
    });
    res.json({ cartItems });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
});

// Checkout: Move cart items into an order
router.post("/cart/checkout", authenticateUser, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    // 1️⃣ Lấy danh sách sản phẩm trong giỏ
    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // 2️⃣ Tính tổng tiền
    const totalAmount = cartItems.reduce((sum, item) => {
      const price = item.product.onSaleFlag
        ? item.product.salePrice
        : item.product.originalPrice;
      return sum + price * item.quantity;
    }, 0);

    // 3️⃣ Tạo đơn hàng
    const order = await prisma.order.create({
      data: {
        userId,
        totalAmount,
        status: "PENDING",
        items: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.onSaleFlag
              ? item.product.salePrice
              : item.product.originalPrice,
          })),
        },
      },
      include: { items: true },
    });

    // 4️⃣ Xoá giỏ hàng sau khi tạo đơn
    await prisma.cart.deleteMany({ where: { userId } });

    res.json({
      message: "Checkout successful",
      order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during checkout" });
  }
});
// ===========================
// get all orders for user
// ===========================
router.get("/orders", authenticateUser, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, code: true, onSaleFlag: true, salePrice: true, originalPrice: true }
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while fetching user orders" });
  }
});
// ===========================
// Delete an order for user
// ===========================
router.delete("/orders/:orderId", authenticateUser, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const orderId = parseInt(req.params.orderId);

    // Lấy order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.userId !== userId) return res.status(403).json({ message: "Forbidden" });

    // Chỉ cho phép xoá DONE hoặc CANCELLED
    if (!["DONE", "CANCELLED"].includes(order.status)) {
      return res.status(400).json({ message: "Cannot delete order in current status" });
    }

    // Xoá tất cả order items
    await prisma.orderItem.deleteMany({ where: { orderId } });

    // Xoá order
    await prisma.order.delete({ where: { id: orderId } });

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while deleting order" });
  }
});

export default router;
