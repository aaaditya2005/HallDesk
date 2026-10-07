import prisma from "./prisma.js";

const connectDB = async () => {
  try {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");

    await prisma.$connect();
    console.log("PostgreSQL Connected securely via Prisma Client.");
    return prisma;
  } catch (error) {
    console.error("Database Connection Failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;