import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

// Cloudinary storage config
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/\s+/g, "_").split(".")[0];
    return {
      folder: "coopmini-products",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      public_id: `${timestamp}-${originalName}`,
      transformation: [{ width: 1200, crop: "limit", quality: "auto" }], // resize nhẹ để tối ưu
    };
  },
});

// Multer upload config
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
});

export default cloudinary;
