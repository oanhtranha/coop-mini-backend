import express from "express";
import cors from "cors";
import adminRoutes from "./routes/admin";
import userRoutes from "./routes/user";

const app = express();


app.use(express.json());

app.use("/admin", adminRoutes); // /admin/products
app.use("/user", userRoutes);   // /signup, /login

export default app;
