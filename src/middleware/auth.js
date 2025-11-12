"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = exports.authenticateAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Middleware xác thực admin
const authenticateAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const token = authHeader.split(" ")[1];
        const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!payload.isAdmin) {
            return res.status(403).json({ message: "Forbidden: Admin only" });
        }
        // Lưu payload vào request để dùng sau
        req.user = payload;
        next();
    }
    catch (error) {
        console.error(error);
        return res.status(401).json({ message: "Invalid token" });
    }
};
exports.authenticateAdmin = authenticateAdmin;
// Middleware xác thực user (không cần admin)
const authenticateUser = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const token = authHeader.split(" ")[1];
        const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (error) {
        console.error(error);
        return res.status(401).json({ message: "Invalid token" });
    }
};
exports.authenticateUser = authenticateUser;
