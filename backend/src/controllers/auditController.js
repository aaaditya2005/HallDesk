import prisma from "../config/prisma.js";

const describeTransfer = async (log) => {
  const details = log.details || {};
  if (log.action !== "transferred" || log.entity !== "User") return log;

  const [student, fromHall, toHall, toRoom] = await Promise.all([
    log.entityId ? prisma.user.findUnique({ where: { id: log.entityId }, select: { name: true, registrationNo: true } }) : null,
    details.fromHallId ? prisma.hall.findUnique({ where: { id: details.fromHallId }, select: { hallName: true, hallNumber: true } }) : null,
    details.toHallId ? prisma.hall.findUnique({ where: { id: details.toHallId }, select: { hallName: true, hallNumber: true } }) : null,
    details.toRoomId ? prisma.room.findUnique({ where: { id: details.toRoomId }, select: { roomNumber: true, block: true, floor: true } }) : null,
  ]);

  const targetHall = toHall ? `Hall ${toHall.hallNumber} - ${toHall.hallName}` : "destination hall";
  const targetRoom = toRoom ? `, Room ${toRoom.roomNumber}` : " (room pending)";
  const sourceHall = fromHall ? ` from Hall ${fromHall.hallNumber} - ${fromHall.hallName}` : " (source hall was not recorded in this older log)";
  const name = student ? `${student.name}${student.registrationNo ? ` (${student.registrationNo})` : ""}` : "Student";

  return {
    ...log,
    _id: log.id,
    details: { description: `${name} transferred${sourceHall} to ${targetHall}${targetRoom}.` },
  };
};

const describeIssue = async (log) => {
  if (log.entity !== "Issue") return log;

  const details = log.details || {};
  const userIds = [details.reportedBy, details.assignedTo].filter(Boolean);
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, username: true } });
  const usersById = new Map(users.map((user) => [user.id, user]));
  const nextDetails = { ...details };
  const reportedBy = usersById.get(String(details.reportedBy));
  const assignedTo = usersById.get(String(details.assignedTo));

  delete nextDetails.reportedBy;
  delete nextDetails.assignedTo;
  nextDetails.reportedByName = reportedBy?.name || "Unknown student";
  nextDetails.assignedToName = assignedTo?.name || (details.assignedTo ? "Unknown user" : "Not assigned");

  return { ...log, _id: log.id, details: nextDetails };
};

export const getAdminAuditLogs = async (req, res) => {
  try {
    const where = {};

    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(`${req.query.from}T00:00:00.000Z`);
      if (req.query.to) where.createdAt.lte = new Date(`${req.query.to}T23:59:59.999Z`);
    }

    if (req.query.role && ["admin", "warden", "student", "mess_manager"].includes(req.query.role)) {
      const actors = await prisma.user.findMany({ where: { role: req.query.role }, select: { id: true } });
      where.actorId = { in: actors.map((a) => a.id) };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, username: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const formattedLogs = logs.map((l) => ({
      ...l,
      _id: l.id,
      actor: l.actor ? { ...l.actor, _id: l.actor.id } : l.actorId,
    }));

    const describedLogs = await Promise.all(formattedLogs.map(async (log) => describeIssue(await describeTransfer(log))));

    res.json({ success: true, logs: describedLogs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};