import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// 🧩 Tạo storage Cloudinary cho multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) =>
    ({
      folder: "coopmini-products", // ✅ không còn lỗi TS nhờ 'as any'
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
      public_id: `${Date.now()}-${file.originalname}`,
      transformation: [{ quality: "auto" }],
    } as any), // ⚠️ thêm 'as any' để bỏ qua kiểm tra kiểu Params
});

export const upload = multer({ storage });
export default cloudinary;


