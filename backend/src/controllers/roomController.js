import prisma from "../config/prisma.js";

const writeAudit = (req, action, entity, entityId, details) => {
  req.auditRecorded = true;
  return prisma.auditLog.create({
    data: {
      actorId: req.user.id || req.user._id,
      action,
      entity,
      entityId: entityId ? String(entityId) : null,
      details: details || {},
    },
  });
};

const formatRoom = (room) => {
  if (!room) return null;
  return {
    ...room,
    _id: room.id,
    hallId: room.hall ? { ...room.hall, _id: room.hall.id } : room.hallId,
    occupants: room.occupants ? room.occupants.map((o) => ({ ...o, _id: o.id })) : [],
  };
};

const updateHallRoomStats = async (hallId) => {
  if (!hallId) return;
  const rooms = await prisma.room.findMany({
    where: { hallId },
    include: { occupants: true },
  });
  await prisma.hall.update({
    where: { id: hallId },
    data: {
      availableRooms: rooms.filter((r) => r.occupants.length === 0).length,
      occupiedRooms: rooms.filter((r) => r.occupants.length > 0).length,
    },
  });
};

export const createRoom = async (req, res) => {
  try {
    const { hallId, block, floor, roomNumber, capacity, isActive } = req.body;

    const hall = await prisma.hall.findUnique({ where: { id: hallId } });
    if (!hall) return res.status(400).json({ success: false, message: "Selected hall does not exist." });

    const room = await prisma.room.create({
      data: {
        hallId,
        block,
        floor: Number(floor),
        roomNumber: String(roomNumber),
        capacity: Number(capacity),
        status: "Available",
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: {
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        occupants: { select: { id: true, name: true, registrationNo: true, branch: true } },
      },
    });

    await writeAudit(req, "created", "Room", room.id, { roomNumber: room.roomNumber });

    res.status(201).json({
      success: true,
      room: formatRoom(room),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getAllRooms = async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        occupants: { select: { id: true, name: true, registrationNo: true, branch: true } },
      },
      orderBy: { roomNumber: "asc" },
    });

    const formattedRooms = rooms.map(formatRoom);
    res.status(200).json({
      success: true,
      count: formattedRooms.length,
      rooms: formattedRooms,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getWardenRooms = async (req, res) => {
  try {
    const wardenHallId = req.user.hallId?.id || req.user.hallId;
    if (!wardenHallId) {
      return res.status(400).json({ success: false, message: "Your account is not assigned to a hall." });
    }

    const rooms = await prisma.room.findMany({
      where: { hallId: wardenHallId },
      include: {
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        occupants: { select: { id: true, name: true, registrationNo: true, branch: true, department: true, currentYear: true } },
      },
      orderBy: { roomNumber: "asc" },
    });

    const formattedRooms = rooms.map(formatRoom);
    res.status(200).json({ success: true, count: formattedRooms.length, rooms: formattedRooms });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getRoomById = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const userHallId = req.user.hallId?.id || req.user.hallId;
    const userRoomId = req.user.roomId?.id || req.user.roomId;

    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: {
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        occupants: { select: { id: true, name: true, registrationNo: true, branch: true } },
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const isOwnRoom = String(userRoomId || "") === String(room.id);
    const isRoomOccupant = room.occupants.some((o) => String(o.id) === String(userId));

    if (req.user.role === "student" && !isOwnRoom && !isRoomOccupant) {
      return res.status(403).json({ success: false, message: "You cannot access another student's room." });
    }
    if (["warden", "mess_manager"].includes(req.user.role) && String(userHallId || "") !== String(room.hallId)) {
      return res.status(403).json({ success: false, message: "You cannot access a room outside your hall." });
    }

    res.status(200).json({
      success: true,
      room: formatRoom(room),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const generateRooms = async (req, res) => {
  try {
    const { hallId, block, totalFloors, roomsPerFloor, roomCapacity, startFloor = 1, roomPrefix = "" } = req.body;

    const hall = await prisma.hall.findUnique({ where: { id: hallId } });
    if (!hall) return res.status(400).json({ success: false, message: "Selected hall does not exist." });

    const roomsData = [];
    for (let floor = startFloor; floor < startFloor + totalFloors; floor++) {
      for (let room = 1; room <= roomsPerFloor; room++) {
        const roomNumber = `${roomPrefix}${floor}${String(room).padStart(2, "0")}`;
        roomsData.push({
          hallId,
          block,
          floor,
          roomNumber,
          capacity: roomCapacity,
          status: "Available",
          isActive: true,
        });
      }
    }

    await prisma.room.createMany({ data: roomsData });
    await writeAudit(req, "created_bulk", "Room", null, { hallId, count: roomsData.length, block });

    const allRooms = await prisma.room.findMany({ where: { hallId } });
    const totalCapacity = allRooms.reduce((acc, r) => acc + r.capacity, 0);

    await prisma.hall.update({
      where: { id: hallId },
      data: {
        availableRooms: allRooms.length,
        occupiedRooms: 0,
        capacity: totalCapacity,
      },
    });

    res.status(201).json({
      success: true,
      count: roomsData.length,
      message: "Rooms generated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.id }, include: { occupants: true } });
    if (!room) return res.status(404).json({ success: false, message: "Room not found." });

    const allowed = ["hallId", "block", "floor", "roomNumber", "capacity", "status", "isActive"];
    const updateData = {};
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.floor !== undefined) updateData.floor = Number(updateData.floor);
    if (updateData.capacity !== undefined) updateData.capacity = Number(updateData.capacity);

    if (updateData.capacity !== undefined && room.occupants.length > updateData.capacity) {
      return res.status(400).json({ success: false, message: "Capacity cannot be below current occupants." });
    }

    const updated = await prisma.room.update({
      where: { id: room.id },
      data: updateData,
    });

    await writeAudit(req, "updated", "Room", room.id, { roomNumber: updated.roomNumber });
    res.json({ success: true, room: formatRoom(updated) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.id }, include: { occupants: true } });
    if (!room) return res.status(404).json({ success: false, message: "Room not found." });
    if (room.occupants.length) return res.status(409).json({ success: false, message: "Room cannot be deleted while occupants are assigned." });

    await prisma.room.delete({ where: { id: room.id } });
    await writeAudit(req, "deleted", "Room", room.id, { roomNumber: room.roomNumber });

    res.json({ success: true, message: "Room deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const assignStudentToRoom = async (req, res) => {
  try {
    const wardenHallId = req.user.hallId?.id || req.user.hallId;
    const userId = req.user.id || req.user._id;

    const student = await prisma.user.findFirst({
      where: { id: req.body.studentId, role: "student", hallId: wardenHallId },
    });
    const room = await prisma.room.findFirst({
      where: { id: req.params.roomId, hallId: wardenHallId },
      include: { occupants: true },
    });

    if (!student) return res.status(404).json({ success: false, message: "Student is not assigned to your hall." });
    if (!room) return res.status(404).json({ success: false, message: "Room not found in your hall." });
    if (student.roomId) return res.status(409).json({ success: false, message: "Student already has a room. Use transfer for room changes." });
    if (!room.isActive || room.status === "Under Maintenance") return res.status(400).json({ success: false, message: "Room is not available." });
    if (room.occupants.length >= room.capacity) return res.status(409).json({ success: false, message: "Room is full." });

    await prisma.user.update({
      where: { id: student.id },
      data: { roomId: room.id },
    });

    const updatedOccupantsCount = room.occupants.length + 1;
    const newStatus = updatedOccupantsCount >= room.capacity ? "Full" : "Partially Occupied";

    await prisma.room.update({
      where: { id: room.id },
      data: { status: newStatus },
    });

    const openHistory = await prisma.residenceHistory.findFirst({
      where: { studentId: student.id, endDate: null },
      orderBy: { startDate: "desc" },
    });

    if (openHistory) {
      await prisma.residenceHistory.update({
        where: { id: openHistory.id },
        data: { roomId: room.id, status: "Allocated", assignedById: userId },
      });
    } else {
      await prisma.residenceHistory.create({
        data: {
          studentId: student.id,
          hallId: wardenHallId,
          roomId: room.id,
          academicYear: student.currentYear,
          status: "Allocated",
          assignedById: userId,
        },
      });
    }

    await updateHallRoomStats(wardenHallId);

    await writeAudit(req, "assigned", "Room", room.id, {
      studentId: student.id,
      studentName: student.name,
      registrationNo: student.registrationNo,
      roomNumber: room.roomNumber,
      block: room.block,
      floor: room.floor,
      method: "manual_or_lottery",
    });

    const updatedStudent = await prisma.user.findUnique({
      where: { id: student.id },
      select: { id: true, name: true, registrationNo: true, currentYear: true, hallId: true, roomId: true, room: { select: { id: true, roomNumber: true, floor: true, block: true, status: true } } },
    });

    res.json({ success: true, message: "Student assigned to room.", student: { ...updatedStudent, _id: updatedStudent.id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const previewRoomLottery = async (req, res) => {
  try {
    const wardenHallId = req.user.hallId?.id || req.user.hallId;
    const requestedFloor = req.body.floor;
    const requestedBlock = req.body.block;

    const student = await prisma.user.findFirst({
      where: { id: req.body.studentId, role: "student", hallId: wardenHallId, roomId: null },
      select: { id: true, name: true, registrationNo: true },
    });
    if (!student) return res.status(404).json({ success: false, message: "Student is not an unassigned student in your hall." });

    const rooms = await prisma.room.findMany({
      where: {
        hallId: wardenHallId,
        isActive: true,
        status: { not: "Under Maintenance" },
        ...(requestedFloor !== undefined && requestedFloor !== "All" ? { floor: Number(requestedFloor) } : {}),
        ...(requestedBlock && requestedBlock !== "All" ? { block: requestedBlock } : {}),
      },
      include: { occupants: true },
    });

    const availableRooms = rooms.filter((r) => r.occupants.length < r.capacity);
    if (!availableRooms.length) return res.status(409).json({ success: false, message: "No empty room capacity is available for the lottery." });

    const partiallyOccupiedRooms = availableRooms.filter((r) => r.occupants.length > 0);
    const lotteryPool = partiallyOccupiedRooms.length ? partiallyOccupiedRooms : availableRooms;
    const room = lotteryPool[Math.floor(Math.random() * lotteryPool.length)];

    await writeAudit(req, "lottery_previewed", "Room", room.id, {
      studentId: student.id,
      studentName: student.name,
      registrationNo: student.registrationNo,
      roomNumber: room.roomNumber,
      block: room.block,
      floor: room.floor,
      occupants: room.occupants.length,
      capacity: room.capacity,
      poolType: partiallyOccupiedRooms.length ? "partially_occupied" : "empty",
    });

    res.json({ success: true, room: { id: room.id, _id: room.id, roomNumber: room.roomNumber, block: room.block, floor: room.floor, occupants: room.occupants.length, capacity: room.capacity } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};