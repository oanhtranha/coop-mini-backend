// src/utils/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

// Multer + Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/\s+/g, "_").split(".")[0]; // tránh space và lấy tên
    return {
      folder: "coopmini-products",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      public_id: `${timestamp}-${originalName}`, // ví dụ: 1762988668218-milk
      transformation: [{ quality: "auto" }],
    };
  },
});

// Export Multer upload
export const upload = multer({ storage });
export default cloudinary;
