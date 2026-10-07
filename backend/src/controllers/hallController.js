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

const formatHall = (hall) => (hall ? { ...hall, _id: hall.id } : null);

export const createHall = async (req, res) => {
  try {
    const { hallNumber, hallName, gender, totalFloors, blocks, capacity, description, isActive } = req.body;

    const hall = await prisma.hall.create({
      data: {
        hallNumber: Number(hallNumber),
        hallName,
        gender,
        totalFloors: Number(totalFloors),
        blocks: Array.isArray(blocks) ? blocks : [],
        capacity: Number(capacity),
        description: description || "",
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    await writeAudit(req, "created", "Hall", hall.id, { hallNumber: hall.hallNumber });

    res.status(201).json({
      success: true,
      hall: formatHall(hall),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getAllHalls = async (req, res) => {
  try {
    const halls = await prisma.hall.findMany({ orderBy: { hallNumber: "asc" } });

    const formattedHalls = halls.map(formatHall);
    res.status(200).json({
      success: true,
      count: formattedHalls.length,
      halls: formattedHalls,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getHallById = async (req, res) => {
  try {
    const hall = await prisma.hall.findUnique({ where: { id: req.params.id } });

    if (!hall) {
      return res.status(404).json({
        success: false,
        message: "Hall not found",
      });
    }

    res.status(200).json({
      success: true,
      hall: formatHall(hall),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateHall = async (req, res) => {
  try {
    const hall = await prisma.hall.findUnique({ where: { id: req.params.id } });
    if (!hall) return res.status(404).json({ success: false, message: "Hall not found." });

    const allowed = ["hallNumber", "hallName", "gender", "totalFloors", "blocks", "description", "isActive"];
    const updateData = {};
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.hallNumber !== undefined) updateData.hallNumber = Number(updateData.hallNumber);
    if (updateData.totalFloors !== undefined) updateData.totalFloors = Number(updateData.totalFloors);

    if (updateData.gender) {
      const incompatibleUser = await prisma.user.findFirst({
        where: { hallId: hall.id, gender: { not: updateData.gender } },
      });
      if (incompatibleUser) {
        return res.status(400).json({ success: false, message: "Hall gender cannot change while incompatible users are assigned." });
      }
    }

    const updated = await prisma.hall.update({
      where: { id: hall.id },
      data: updateData,
    });

    await writeAudit(req, "updated", "Hall", hall.id, { hallNumber: updated.hallNumber });
    res.json({ success: true, hall: formatHall(updated) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const deleteHall = async (req, res) => {
  try {
    const hall = await prisma.hall.findUnique({ where: { id: req.params.id } });
    if (!hall) return res.status(404).json({ success: false, message: "Hall not found." });

    const [roomCount, userCount] = await Promise.all([
      prisma.room.count({ where: { hallId: hall.id } }),
      prisma.user.count({ where: { hallId: hall.id } }),
    ]);

    if (roomCount || userCount) {
      return res.status(409).json({ success: false, message: "Hall cannot be deleted while rooms or users are assigned. Deactivate it instead." });
    }

    await prisma.hall.delete({ where: { id: hall.id } });
    await writeAudit(req, "deleted", "Hall", hall.id, { hallNumber: hall.hallNumber });

    res.json({ success: true, message: "Hall deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};