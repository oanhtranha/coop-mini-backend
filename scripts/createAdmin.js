"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../generated/prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new prisma_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const email = "admin@coop.no";
            const username = "adminuser";
            const password = "123456"; // password gốc
            // 1️⃣ Kiểm tra xem user đã tồn tại chưa
            const existing = yield prisma.user.findUnique({ where: { email } });
            if (existing) {
                console.log("User đã tồn tại:", existing.email);
                return;
            }
            // 2️⃣ Hash password
            const hashedPassword = yield bcrypt_1.default.hash(password, 10);
            // 3️⃣ Tạo user admin
            const adminUser = yield prisma.user.create({
                data: {
                    email,
                    username,
                    password: hashedPassword,
                    isAdmin: true, // set quyền admin
                },
            });
            console.log("Admin created successfully:", adminUser);
        }
        catch (error) {
            console.error("Lỗi tạo admin:", error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
// Chạy function
main();
