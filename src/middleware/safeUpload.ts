import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { upload } from "../utils/cloudinary";

/**
 * Middleware an toàn để upload file và handle lỗi Multer
 */
export const safeUpload = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn 5MB",
          });
        }
        return res.status(400).json({
          message: "Lỗi upload file",
          error: err.message,
        });
      } else if (err) {
        console.error("❌ Upload error:", err);
        return res.status(500).json({
          message: "Lỗi server khi upload file",
        });
      }
      next();
    });
  };
};
