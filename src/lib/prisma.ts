import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import "dotenv/config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
console.log("=== BUILD DEBUG ===");
console.log("DATABASE_URL is:", process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + "..." : "UNDEFINED");
console.log("TURSO_AUTH_TOKEN is:", process.env.TURSO_AUTH_TOKEN ? "SET" : "UNDEFINED");
console.log("===================");

const adapter = new PrismaLibSQL({
  url: dbUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
