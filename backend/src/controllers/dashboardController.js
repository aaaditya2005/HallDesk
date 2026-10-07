import prisma from "../config/prisma.js";

export const getAdminDashboard = async (req, res) => {
  try {
    const [users, halls, rooms, openIssues, pendingFines, pendingCertificates] = await Promise.all([
      prisma.user.findMany({ select: { role: true, gender: true, currentYear: true, hallId: true } }),
      prisma.hall.findMany({ select: { id: true, hallNumber: true, hallName: true, gender: true, capacity: true, availableRooms: true, occupiedRooms: true }, orderBy: { hallNumber: "asc" } }),
      prisma.room.findMany({ select: { hallId: true, capacity: true, occupants: { select: { id: true } }, status: true } }),
      prisma.issue.count({ where: { status: { in: ["Pending", "Accepted", "In Progress"] } } }),
      prisma.fine.count({ where: { status: { in: ["Pending", "Verification Pending"] } } }),
      prisma.certificate.count({ where: { status: "Pending" } }),
    ]);

    const students = users.filter((user) => user.role === "student");
    const roleCounts = users.reduce((counts, user) => {
      counts[user.role] = (counts[user.role] || 0) + 1;
      return counts;
    }, {});
    const genderCounts = students.reduce((counts, user) => {
      if (user.gender) counts[user.gender] = (counts[user.gender] || 0) + 1;
      return counts;
    }, {});
    const yearCounts = students.reduce((counts, user) => {
      if (user.currentYear) counts[user.currentYear] = (counts[user.currentYear] || 0) + 1;
      return counts;
    }, {});

    const hallSummaries = halls.map((hall) => {
      const hallRooms = rooms.filter((room) => String(room.hallId) === String(hall.id));
      return {
        ...hall,
        _id: hall.id,
        roomCount: hallRooms.length,
        occupiedBeds: hallRooms.reduce((total, room) => total + (room.occupants?.length || 0), 0),
        availableBeds: hallRooms.reduce((total, room) => total + Math.max(room.capacity - (room.occupants?.length || 0), 0), 0),
      };
    });

    res.json({
      success: true,
      data: {
        totals: {
          users: users.length,
          students: roleCounts.student || 0,
          wardens: roleCounts.warden || 0,
          messManagers: roleCounts.mess_manager || 0,
          halls: halls.length,
          rooms: rooms.length,
          occupiedBeds: hallSummaries.reduce((total, hall) => total + hall.occupiedBeds, 0),
          availableBeds: hallSummaries.reduce((total, hall) => total + hall.availableBeds, 0),
        },
        pending: { issues: openIssues, fines: pendingFines, certificates: pendingCertificates },
        roleCounts,
        genderCounts,
        yearCounts,
        halls: hallSummaries,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const hallId = req.user.hallId?.id || req.user.hallId;

    const [openIssues, pendingCertificates, activePolls, pendingFines, notices, recentIssues, recentCertificates, recentFines] = await Promise.all([
      prisma.issue.count({ where: { reportedById: userId, status: { in: ["Pending", "Accepted", "In Progress"] } } }),
      prisma.certificate.count({ where: { studentId: userId, status: "Pending" } }),
      hallId ? prisma.poll.count({ where: { hallId, status: "Active", isActive: true } }) : 0,
      prisma.fine.count({ where: { studentId: userId, status: { in: ["Pending", "Verification Pending"] } } }),
      hallId ? prisma.notice.findMany({ where: { hallId, status: "Active", isActive: true }, select: { id: true, title: true, description: true, status: true, createdAt: true, attachment: true }, orderBy: { createdAt: "desc" }, take: 3 }) : [],
      prisma.issue.findMany({ where: { reportedById: userId }, select: { id: true, issueNumber: true, title: true, status: true, updatedAt: true, createdAt: true }, orderBy: { updatedAt: "desc" }, take: 3 }),
      prisma.certificate.findMany({ where: { studentId: userId }, select: { id: true, certificateRequestNumber: true, certificateType: true, status: true, updatedAt: true, createdAt: true }, orderBy: { updatedAt: "desc" }, take: 3 }),
      prisma.fine.findMany({ where: { studentId: userId }, select: { id: true, fineNumber: true, status: true, updatedAt: true, createdAt: true }, orderBy: { updatedAt: "desc" }, take: 3 }),
    ]);

    const recentActivity = [
      ...recentIssues.map((issue) => `Issue ${issue.issueNumber || issue.title} is ${issue.status}.`),
      ...recentCertificates.map((certificate) => `${certificate.certificateType} certificate is ${certificate.status}.`),
      ...recentFines.map((fine) => `Fine ${fine.fineNumber} is ${fine.status}.`),
    ].slice(0, 5);

    const formattedNotices = notices.map((n) => ({ ...n, _id: n.id }));

    res.json({
      success: true,
      data: {
        openIssues,
        pendingCertificates,
        activePolls,
        pendingFines,
        notices: formattedNotices,
        recentActivity,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};