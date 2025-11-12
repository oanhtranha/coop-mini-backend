import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = path.extname(file.originalname); // ".png"
    const name = path.basename(file.originalname, ext); // "milk"
    return {
      folder: "coopmini-products",
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
      public_id: `${Date.now()}-${name}`, // "1762988668218-milk"
      transformation: [{ quality: "auto" }],
    } as any;
  },
});


export const upload = multer({ storage });
export default cloudinary;


