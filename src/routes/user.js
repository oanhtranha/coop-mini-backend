"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../generated/prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new prisma_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";
// ===========================
// Signup
// ===========================
router.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, username, password } = req.body;
        const existingUser = yield prisma.user.findUnique({ where: { email } });
        if (existingUser)
            return res.status(400).json({ message: "Email already exists" });
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const user = yield prisma.user.create({ data: { email, username, password: hashedPassword } });
        res.status(201).json({ message: "Signup successful", userId: user.id });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "server error" });
    }
}));
// ===========================
// Login
// ===========================
router.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(401).json({ message: "Email or password is incorrect" });
        const isValid = yield bcrypt_1.default.compare(password, user.password);
        if (!isValid)
            return res.status(401).json({ message: "Email or password is incorrect" });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: "7d" });
        res.json({
            message: "Login successful", token, user: {
                id: user.id,
                email: user.email,
                username: user.username,
                createdAt: user.createdAt
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "server error" });
    }
}));
// ===========================
// Logout (client chỉ xóa token, backend optional)
// ===========================
router.post("/logout", auth_1.authenticateUser, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Token vẫn hợp lệ, logout chỉ xóa trên client
    res.json({ message: "Logout successful" });
}));
// ===========================
// Get current user
// ===========================
router.get("/me", auth_1.authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, username: true }
        });
        res.json({ user });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "server error" });
    }
}));
// ===========================
// Update user info
// ===========================
router.put("/me", auth_1.authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const { username, password } = req.body;
        const data = {};
        if (username)
            data.username = username;
        if (password)
            data.password = yield bcrypt_1.default.hash(password, 10);
        const updatedUser = yield prisma.user.update({
            where: { id: userId },
            data,
            select: { id: true, email: true, username: true }
        });
        res.json({ message: "Update Successfull!", user: updatedUser });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "server error" });
    }
}));
// ===========================
// Get all products for user
// ===========================
router.get("/products", auth_1.authenticateUser, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield prisma.product.findMany();
        res.json({ products });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "server error" });
    }
}));
// ===========================
// Cart management
// ===========================
// Add product to cart
router.post("/cart", auth_1.authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const { productId, quantity } = req.body;
        if (!productId || !quantity || quantity < 1) {
            return res.status(400).json({ message: "ProductId and quantity are required" });
        }
        // Kiểm tra đã có cart item chưa
        const existing = yield prisma.cart.findFirst({ where: { userId, productId } });
        if (existing) {
            const updated = yield prisma.cart.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + quantity }
            });
            return res.json({ message: "Update cart successful", cartItem: updated });
        }
        const cartItem = yield prisma.cart.create({
            data: { userId, productId, quantity }
        });
        res.json({ message: "Add to cart successful", cartItem });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "server error" });
    }
}));
// Remove product from cart
router.delete("/cart/:productId", auth_1.authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const productId = Number(req.params.productId);
        yield prisma.cart.deleteMany({ where: { userId, productId } });
        res.json({ message: "Remove product from cart successful" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "server error" });
    }
}));
// Update product quantity in cart
router.put("/cart/:productId", auth_1.authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const productId = Number(req.params.productId);
        const { quantity } = req.body;
        if (!quantity || quantity < 1) {
            return res.status(400).json({ message: "Quantity is required and must be greater than 0" });
        }
        // Update product quantity
        yield prisma.cart.updateMany({
            where: { userId, productId },
            data: { quantity }
        });
        const cartItem = yield prisma.cart.findFirst({
            where: { userId, productId },
            include: { product: true },
        });
        res.json({
            message: "Update quantity successful",
            cartItem,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "server error" });
    }
}));
// Get all cart items for user
router.get("/cart", auth_1.authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const cartItems = yield prisma.cart.findMany({
            where: { userId },
            include: { product: true }
        });
        res.json({ cartItems });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "server error" });
    }
}));
// Checkout: Move cart items into an order
router.post("/cart/checkout", auth_1.authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const cartItems = yield prisma.cart.findMany({
            where: { userId },
            include: { product: true },
        });
        if (cartItems.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }
        const totalAmount = cartItems.reduce((sum, item) => {
            const price = item.product.onSaleFlag
                ? item.product.salePrice
                : item.product.originalPrice;
            return sum + price * item.quantity;
        }, 0);
        const order = yield prisma.order.create({
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
        yield prisma.cart.deleteMany({ where: { userId } });
        res.json({
            message: "Checkout successful",
            order,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error during checkout" });
    }
}));
// ===========================
// get all orders for user
// ===========================
router.get("/orders", auth_1.authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const orders = yield prisma.order.findMany({
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error while fetching user orders" });
    }
}));
// ===========================
// Delete an order for user
// ===========================
router.delete("/orders/:orderId", auth_1.authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const orderId = parseInt(req.params.orderId);
        const order = yield prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        if (order.userId !== userId)
            return res.status(403).json({ message: "Forbidden" });
        if (!["DONE", "CANCELLED"].includes(order.status)) {
            return res.status(400).json({ message: "Cannot delete order in current status" });
        }
        yield prisma.orderItem.deleteMany({ where: { orderId } });
        yield prisma.order.delete({ where: { id: orderId } });
        res.json({ message: "Order deleted successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error while deleting order" });
    }
}));
exports.default = router;
