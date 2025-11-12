"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const admin_1 = __importDefault(require("./routes/admin"));
const user_1 = __importDefault(require("./routes/user"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ===========================
// Routes
// ===========================
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
app.use("/admin", admin_1.default); // /admin/products
app.use("/user", user_1.default); // /signup, /login
exports.default = app;
