import dotenv from "dotenv";
import prisma from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/authUtils.js";

dotenv.config();

const testStudents = [
  ["Year Change Test Student 1", "21U90001", "BT"],
  ["Year Change Test Student 2", "21U90002", "CE"],
  ["Year Change Test Student 3", "21U90003", "CH"],
  ["Year Change Test Student 4", "21U90004", "CS"],
  ["Year Change Test Student 5", "21U90005", "EE"],
];

try {
  const hall = await prisma.hall.findUnique({ where: { hallNumber: 11 } });
  if (!hall) throw new Error("Hall 11 does not exist. Run the halls and rooms seed first.");

  let created = 0;
  let skipped = 0;

  for (const [name, registrationNo, department] of testStudents) {
    const existing = await prisma.user.findUnique({ where: { registrationNo } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          hallId: hall.id,
          roomId: null,
          currentYear: 1,
        },
      });
      skipped += 1;
      console.log(`Student reset as unassigned: ${registrationNo}`);
      continue;
    }

    const hashedPassword = await hashPassword(registrationNo);

    await prisma.user.create({
      data: {
        name,
        username: registrationNo,
        email: `${registrationNo.toLowerCase()}@test.halldesk.local`,
        password: hashedPassword,
        phone: "9000000000",
        role: "student",
        hallId: hall.id,
        roomId: null,
        registrationNo,
        department,
        course: "BTech",
        currentYear: 1,
        parentPhone: "8000000000",
        gender: hall.gender,
      },
    });

    created += 1;
    console.log(`Student created as unassigned: ${registrationNo}`);
  }

  const hallRooms = await prisma.room.findMany({
    where: { hallId: hall.id },
    include: { occupants: true },
  });

  const availableCount = hallRooms.filter((r) => r.occupants.length === 0).length;
  const occupiedCount = hallRooms.filter((r) => r.occupants.length > 0).length;

  await prisma.hall.update({
    where: { id: hall.id },
    data: {
      availableRooms: availableCount,
      occupiedRooms: occupiedCount,
    },
  });

  console.log(`Test student seed complete. Created: ${created}, existing: ${skipped}`);
} catch (error) {
  console.error("Test student seed error:", error.message);
} finally {
  await prisma.$disconnect();
}