import express from "express";
import cors from "cors";
import path from "path"; 
import adminRoutes from "./routes/admin";
import userRoutes from "./routes/user";

const app = express();

app.use(cors());
app.use(express.json());

// ===========================
// Routes
// ===========================
// app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/admin", adminRoutes);   // /admin/products
app.use("/user", userRoutes);         // /signup, /login

export default app;
