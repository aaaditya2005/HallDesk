import dotenv from "dotenv";
import prisma from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/authUtils.js";
import admins from "./admins.js";

dotenv.config();

try {
  const seedPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!seedPassword) throw new Error("ADMIN_SEED_PASSWORD must be set before running this seed.");

  let created = 0;

  for (const admin of admins) {
    const existingAdmin = await prisma.user.findUnique({
      where: { username: admin.username },
    });

    if (existingAdmin) {
      console.log(`Admin already exists: ${admin.username}`);
      continue;
    }

    const hashedPassword = await hashPassword(seedPassword);

    await prisma.user.create({
      data: {
        name: admin.name,
        username: admin.username,
        email: admin.email,
        password: hashedPassword,
        role: "admin",
        adminLevel: admin.adminLevel || 1,
        phone: admin.phone,
        gender: admin.gender,
      },
    });

    created += 1;
    console.log(`Admin created: ${admin.username}`);
  }

  console.log(`Admin-only seed complete. Created: ${created}`);
} catch (error) {
  console.error("Admin seed error:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
