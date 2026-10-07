import dotenv from "dotenv";
import prisma from "../src/config/prisma.js";
import halls from "./halls.js";
import generateRooms from "./rooms.js";

dotenv.config();

const activeHallNumbers = [1, 2, 3, 9, 11, 13, 14];
const activeHalls = halls.filter((hall) => activeHallNumbers.includes(hall.hallNumber));

try {
  console.log("Cleaning up existing rooms, hall wardens, and halls...");

  // Unlink room and hall references on users to allow clean recreation
  await prisma.user.updateMany({
    data: { roomId: null },
  });

  await prisma.hallWarden.deleteMany();
  await prisma.room.deleteMany();
  await prisma.hall.deleteMany();

  console.log("Existing rooms and halls deleted.");

  const insertedHalls = [];
  for (const hallData of activeHalls) {
    const createdHall = await prisma.hall.create({
      data: {
        hallNumber: hallData.hallNumber,
        hallName: hallData.hallName,
        gender: hallData.gender,
        totalFloors: hallData.totalFloors,
        blocks: Array.isArray(hallData.blocks) ? hallData.blocks : [],
        capacity: hallData.capacity,
        description: hallData.description || "",
        isActive: true,
      },
    });
    insertedHalls.push(createdHall);
  }
  console.log(`Inserted ${insertedHalls.length} active halls.`);

  // Generate all rooms using rooms.js
  const roomData = generateRooms(insertedHalls);

  const formattedRooms = roomData.map((r) => ({
    hallId: r.hallId,
    block: r.block,
    floor: Number(r.floor),
    roomNumber: String(r.roomNumber),
    capacity: Number(r.capacity),
    status: "Available",
    isActive: true,
  }));

  console.log(`Generated ${formattedRooms.length} rooms from rooms.js. Inserting in batch...`);

  await prisma.room.createMany({
    data: formattedRooms,
    skipDuplicates: true,
  });

  console.log(`Successfully inserted ${formattedRooms.length} rooms.`);

  // Update capacity and room counts on each hall
  for (const hall of insertedHalls) {
    const hallRooms = await prisma.room.findMany({
      where: { hallId: hall.id },
      select: { capacity: true },
    });
    const capacitySum = hallRooms.reduce((sum, r) => sum + r.capacity, 0);

    await prisma.hall.update({
      where: { id: hall.id },
      data: {
        availableRooms: hallRooms.length,
        occupiedRooms: 0,
        capacity: capacitySum,
      },
    });
  }

  console.log("Halls and rooms seeding completed successfully!");
} catch (error) {
  console.error("Halls/Rooms seed error:", error.message);
} finally {
  await prisma.$disconnect();
}
