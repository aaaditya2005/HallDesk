import dotenv from "dotenv";
import prisma from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/authUtils.js";
import activeWardens from "./activeWardens.js";

dotenv.config();

try {
  const seedPassword = process.env.WARDEN_SEED_PASSWORD;
  if (!seedPassword) throw new Error("WARDEN_SEED_PASSWORD must be set before running this seed.");

  const hallNumbers = [...new Set(activeWardens.map((w) => w.hallNumber))];
  const halls = await prisma.hall.findMany({
    where: { hallNumber: { in: hallNumbers } },
  });
  const hallsByNumber = new Map(halls.map((h) => [h.hallNumber, h]));
  let created = 0;
  let skipped = 0;

  const hashedPassword = await hashPassword(seedPassword);

  for (const warden of activeWardens) {
    const hall = hallsByNumber.get(warden.hallNumber);
    if (!hall) {
      throw new Error(`Hall ${warden.hallNumber} does not exist.`);
    }

    const username = warden.email.split("@")[0];
    let user = await prisma.user.findUnique({ where: { username } });

    if (user) {
      skipped += 1;
    } else {
      user = await prisma.user.create({
        data: {
          name: warden.name,
          username,
          password: hashedPassword,
          email: warden.email,
          phone: warden.phone,
          role: "warden",
          hallId: hall.id,
          designation: "Warden",
          officePhone: warden.phone,
          profilePhoto: warden.profilePhoto || null,
          gender: hall.gender,
        },
      });
      created += 1;
    }

    if (user.role !== "warden") {
      throw new Error(`${username} already belongs to role ${user.role}.`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        hallId: hall.id,
        gender: hall.gender,
        designation: "Warden",
        profilePhoto: user.profilePhoto || warden.profilePhoto || null,
      },
    });

    const existingLink = await prisma.hallWarden.findUnique({
      where: { hallId_wardenId: { hallId: hall.id, wardenId: user.id } },
    });
    if (!existingLink) {
      await prisma.hallWarden.create({
        data: { hallId: hall.id, wardenId: user.id },
      });
    }
  }

  console.log(`Warden-only seed complete. Created: ${created}, existing: ${skipped}`);
} catch (error) {
  console.error("Warden seed error:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
