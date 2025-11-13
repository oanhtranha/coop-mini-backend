import express from "express";
import cors from "cors";
import adminRoutes from "./routes/admin";
import userRoutes from "./routes/user";

const app = express();


app.use(cors());
// app.use(
//   cors({
//     origin: [
//       "http://localhost:3000", // dev frontend
//       "https://coop-admin.vercel.app", // frontend production URL
//     ],
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   })
// );
app.use(express.json());

app.use("/admin", adminRoutes); // /admin/products
app.use("/user", userRoutes);   // /signup, /login

export default app;
