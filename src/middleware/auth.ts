import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  userId: number;
  isAdmin: boolean;
}

// Middleware xác thực admin
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";

    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

    if (!payload.isAdmin) {
      return res.status(403).json({ message: "Forbidden: Admin only" });
    }

    // Lưu payload vào request để dùng sau
    (req as any).user = payload;

    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Middleware xác thực user (không cần admin)
export const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";

    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

    (req as any).user = payload;
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Invalid token" });
  }
};