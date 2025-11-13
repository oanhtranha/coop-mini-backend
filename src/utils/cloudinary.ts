import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Cloudinary config (dùng biến môi trường)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

// Multer + Cloudinary Storage (tự động upload trực tiếp)
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/\s+/g, "_").split(".")[0];
    return {
      folder: "coopmini-products",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      public_id: `${timestamp}-${originalName}`,
      transformation: [{ quality: "auto" }],
    };
  },
});

// Export Multer upload (giới hạn 5MB)
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export default cloudinary;
