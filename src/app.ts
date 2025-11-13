import express from "express";
import cors from "cors";
import adminRoutes from "./routes/admin";
import userRoutes from "./routes/user";

const app = express();

// ✅ Cấu hình cho upload file lớn (ảnh vài MB)
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ✅ Gắn routes
app.use("/admin", adminRoutes); // /admin/products
app.use("/user", userRoutes);   // /signup, /login

export default app;
