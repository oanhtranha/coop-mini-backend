import { PrismaClient } from "../generated/prisma";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    const email = "admin@coop.no";
    const username = "adminuser";
    const password = "123456"; // password gốc

    // 1️⃣ Kiểm tra xem user đã tồn tại chưa
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log("User đã tồn tại:", existing.email);
      return;
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Tạo user admin
    const adminUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        isAdmin: true,  // set quyền admin
      },
    });

    console.log("Admin created successfully:", adminUser);
  } catch (error) {
    console.error("Lỗi tạo admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy function
main();
