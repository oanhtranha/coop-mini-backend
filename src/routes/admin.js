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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../generated/prisma");
const auth_1 = require("../middleware/auth");
const cloudinary_1 = require("../utils/cloudinary");
const prisma = new prisma_1.PrismaClient();
const router = (0, express_1.Router)();
// Multer setup
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, path.join(__dirname, "../../uploads")),
//   filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
// });
// const upload = multer({ storage });
// GET ALL PRODUCTS
router.get("/products", auth_1.authenticateAdmin, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield prisma.product.findMany();
        res.json({ products });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}));
// GET PRODUCT BY ID
router.get("/products/:id", auth_1.authenticateAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const product = yield prisma.product.findUnique({ where: { id: Number(req.params.id) } });
        if (!product)
            return res.status(404).json({ message: "Product not found" });
        res.json({ product });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}));
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
router.post("/products", auth_1.authenticateAdmin, cloudinary_1.upload.single("image"), // "image" là tên field trong form-data
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code, name, description, originalPrice, salePrice } = req.body;
        // ✅ CloudinaryStorage gắn URL ảnh tại req.file.path
        const file = req.file;
        const imageUrl = (file === null || file === void 0 ? void 0 : file.path) || (file === null || file === void 0 ? void 0 : file.url) || null;
        // ✅ Kiểm tra dữ liệu đầu vào
        if (!code || !name || !originalPrice) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        // 🧠 Tạo sản phẩm mới trong database
        const product = yield prisma.product.create({
            data: {
                code,
                name,
                description,
                image: imageUrl,
                originalPrice: Number(originalPrice),
                salePrice: Number(salePrice) || 0,
                onSaleFlag: !!salePrice &&
                    Number(salePrice) > 0 &&
                    Number(salePrice) < Number(originalPrice),
            },
        });
        res.status(201).json({ product });
    }
    catch (err) {
        console.error("❌ Error creating product:", err);
        res.status(500).json({
            message: err instanceof Error ? err.message : "Server error",
        });
    }
}));
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
router.put("/products/:id", auth_1.authenticateAdmin, cloudinary_1.upload.single("image"), // "image" là field trong form-data
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const productId = Number(req.params.id);
        // 🧠 Kiểm tra sản phẩm có tồn tại
        const existing = yield prisma.product.findUnique({ where: { id: productId } });
        if (!existing) {
            return res.status(404).json({ message: "Product not found" });
        }
        const { code, name, description, originalPrice, salePrice } = req.body;
        // 🟢 CloudinaryStorage trả URL tại req.file.path
        const file = req.file;
        const imageUrl = (file === null || file === void 0 ? void 0 : file.path) || (file === null || file === void 0 ? void 0 : file.url) || existing.image;
        // 🧩 Cập nhật dữ liệu sản phẩm
        const updated = yield prisma.product.update({
            where: { id: productId },
            data: {
                code: code !== null && code !== void 0 ? code : existing.code,
                name: name !== null && name !== void 0 ? name : existing.name,
                description: description !== null && description !== void 0 ? description : existing.description,
                image: imageUrl,
                originalPrice: originalPrice ? Number(originalPrice) : existing.originalPrice,
                salePrice: salePrice ? Number(salePrice) : existing.salePrice,
                onSaleFlag: (salePrice ? Number(salePrice) : existing.salePrice) > 0 &&
                    (originalPrice ? Number(originalPrice) : existing.originalPrice) >
                        (salePrice ? Number(salePrice) : existing.salePrice),
            },
        });
        res.json({ product: updated });
    }
    catch (err) {
        console.error("❌ Error updating product:", err);
        res.status(500).json({
            message: err instanceof Error ? err.message : "Server error",
        });
    }
}));
// DELETE PRODUCT
router.delete("/products/:id", auth_1.authenticateAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const productId = Number(req.params.id);
        const product = yield prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        yield prisma.product.delete({ where: { id: productId } });
        res.json({ message: "Product deleted" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}));
// ===========================
// Order management
// ===========================
// Get all orders
router.get("/orders", auth_1.authenticateAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield prisma.order.findMany({
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error while fetching orders" });
    }
}));
// Update order status
router.patch("/orders/:orderId/status", auth_1.authenticateAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        const { status } = req.body; // DELIVERING / DONE
        if (!["DELIVERING", "DONE", "CANCELLED"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const updatedOrder = yield prisma.order.update({
            where: { id: parseInt(orderId) },
            data: { status },
        });
        res.json({ message: "Order status updated", order: updatedOrder });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
}));
exports.default = router;
