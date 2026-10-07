import prisma from "../config/prisma.js";
import { hashPassword, matchPassword } from "../utils/authUtils.js";
import { deleteCloudinaryResource } from "../config/cloudinary.js";

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

const CURRENT_ACADEMIC_YEAR_START = 26;

const getStudentYear = (registrationNo) => {
  const admissionYear = Number(String(registrationNo).match(/^(\d{2})/)?.[1]);
  const year = CURRENT_ACADEMIC_YEAR_START - admissionYear + 1;
  return Number.isInteger(admissionYear) && year >= 1 && year <= 4 ? year : null;
};

const updateHallRoomStats = async (hallId) => {
  if (!hallId) return;
  const rooms = await prisma.room.findMany({
    where: { hallId },
    include: { occupants: true },
  });
  const availableCount = rooms.filter((r) => r.occupants.length === 0).length;
  const occupiedCount = rooms.filter((r) => r.occupants.length > 0).length;
  await prisma.hall.update({
    where: { id: hallId },
    data: {
      availableRooms: availableCount,
      occupiedRooms: occupiedCount,
    },
  });
};

const closeResidence = async (studentId) => {
  await prisma.residenceHistory.updateMany({
    where: { studentId, endDate: null },
    data: { endDate: new Date(), status: "Completed" },
  });
};

const openResidence = (student, hallId, roomId, assignedBy = null) =>
  prisma.residenceHistory.create({
    data: {
      studentId: student.id || student._id,
      hallId,
      roomId,
      academicYear: student.currentYear,
      status: roomId ? "Allocated" : "Pending",
      assignedById: assignedBy,
    },
  });

export const createUserForAdmin = async (req, res) => {
  try {
    const {
      name,
      username,
      password,
      role,
      email,
      phone,
      hallId,
      registrationNo,
      rollNo,
      department,
      branch,
      course,
      currentYear,
      parentPhone,
      gender,
      designation,
      officePhone,
      companyName,
      managerId,
      adminLevel,
    } = req.body;

    if (!name?.trim() || typeof password !== "string" || !password || password.length > 128 || !role) {
      return res.status(400).json({
        success: false,
        message: "Name and role are required; password must be 1 to 128 characters.",
      });
    }

    if (!["student", "warden", "mess_manager", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid user role." });
    }

    if (role === "student" && (!registrationNo?.trim() || !rollNo?.trim() || !gender)) {
      return res.status(400).json({
        success: false,
        message: "Student registration number, roll number, and gender are required.",
      });
    }

    if (role === "student" && getStudentYear(registrationNo) !== 1) {
      return res.status(400).json({
        success: false,
        message: "Only first-year students can be added. Registration number must begin with 26.",
      });
    }

    const generatedUsername = role === "student" ? registrationNo.trim().toUpperCase() : username?.trim();
    if (!generatedUsername) {
      return res.status(400).json({ success: false, message: "Username is required for this role." });
    }

    const existingUser = await prisma.user.findUnique({ where: { username: generatedUsername } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Username already exists." });
    }

    if (role === "student") {
      const normalizedRollNo = rollNo.trim().toUpperCase();
      if (!/^\d{2}(BT|CSE|MM|ME|CHE|EC|EE|CE)8\d{3}$/.test(normalizedRollNo)) {
        return res.status(400).json({ success: false, message: "Roll number must look like 24BT8008." });
      }
      const existingRoll = await prisma.user.findUnique({ where: { rollNo: normalizedRollNo } });
      if (existingRoll) return res.status(409).json({ success: false, message: "Roll number already exists." });
    }

    const hashedPassword = await hashPassword(password);
    let assignedHallId = role === "student" ? null : (hallId || null);

    if (role === "student") {
      const firstYearHallNumber = gender === "Female" ? 13 : 11;
      const firstYearHall = await prisma.hall.findUnique({ where: { hallNumber: firstYearHallNumber } });
      if (!firstYearHall) {
        return res.status(500).json({ success: false, message: "First-year hall configuration is missing." });
      }
      assignedHallId = firstYearHall.id;
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        username: generatedUsername,
        password: hashedPassword,
        role,
        email: email || null,
        phone: phone || null,
        hallId: assignedHallId,
        registrationNo: role === "student" ? registrationNo.trim().toUpperCase() : registrationNo || null,
        rollNo: role === "student" ? rollNo.trim().toUpperCase() : null,
        department: department || null,
        branch: branch || null,
        course: course || null,
        currentYear: role === "student" ? getStudentYear(registrationNo) : (currentYear ? Number(currentYear) : null),
        parentPhone: parentPhone || null,
        gender: gender || null,
        designation: designation || null,
        officePhone: officePhone || null,
        companyName: companyName || null,
        managerId: managerId || null,
        adminLevel: adminLevel ? Number(adminLevel) : null,
      },
      include: {
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        room: { select: { id: true, roomNumber: true, floor: true, block: true } },
      },
    });

    await writeAudit(req, "created", "User", user.id, { username: user.username, role: user.role });

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
      success: true,
      message: "User created successfully.",
      user: {
        ...userWithoutPassword,
        _id: user.id,
        hallId: user.hall ? { ...user.hall, _id: user.hall.id } : user.hallId,
        roomId: user.room ? { ...user.room, _id: user.room.id } : user.roomId,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getAllUsersForAdmin = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      include: {
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        room: { select: { id: true, roomNumber: true, floor: true, block: true } },
      },
    });

    const formattedUsers = users.map((u) => {
      const { password, ...userWO } = u;
      return {
        ...userWO,
        _id: u.id,
        hallId: u.hall ? { ...u.hall, _id: u.hall.id } : u.hallId,
        roomId: u.room ? { ...u.room, _id: u.room.id } : u.roomId,
      };
    });

    res.status(200).json({
      success: true,
      count: formattedUsers.length,
      users: formattedUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getStudentsForWarden = async (req, res) => {
  try {
    const wardenHallId = req.user.hallId?.id || req.user.hallId;
    if (!wardenHallId) {
      return res.status(400).json({ success: false, message: "Warden is not assigned to a hall." });
    }

    const students = await prisma.user.findMany({
      where: { hallId: wardenHallId, role: "student" },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        registrationNo: true,
        rollNo: true,
        branch: true,
        department: true,
        course: true,
        currentYear: true,
        gender: true,
        roomId: true,
        hallId: true,
        isActive: true,
        room: { select: { id: true, roomNumber: true, floor: true, block: true, capacity: true, status: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
      orderBy: [{ registrationNo: "asc" }, { name: "asc" }],
    });

    const formattedStudents = students.map((s) => ({
      ...s,
      _id: s.id,
      hallId: s.hall ? { ...s.hall, _id: s.hall.id } : s.hallId,
      roomId: s.room ? { ...s.room, _id: s.room.id } : s.roomId,
    }));
    res.json({ success: true, count: formattedStudents.length, students: formattedStudents });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const updateUserForAdmin = async (req, res) => {
  try {
    const adminId = req.user.id || req.user._id;
    if (String(req.params.id) === String(adminId)) {
      return res.status(400).json({ success: false, message: "You cannot edit your own admin account here." });
    }
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const allowed = ["name", "email", "phone", "rollNo", "branch", "department", "course", "currentYear", "parentPhone", "gender", "designation", "officePhone", "companyName", "managerId", "adminLevel"];
    const updateData = {};
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updateData[field] = req.body[field] || null;
      }
    }

    if (user.role === "student" && updateData.currentYear !== undefined) {
      const cy = Number(updateData.currentYear);
      if (cy < 1 || cy > 10) {
        return res.status(400).json({ success: false, message: "Current year must be between 1 and 10." });
      }
      updateData.currentYear = cy;
    }

    if (user.role === "student" && updateData.rollNo !== undefined) {
      updateData.rollNo = String(updateData.rollNo).trim().toUpperCase();
      if (!/^\d{2}(BT|CSE|MM|ME|CHE|EC|EE|CE)8\d{3}$/.test(updateData.rollNo)) {
        return res.status(400).json({ success: false, message: "Roll number must look like 24BT8008." });
      }
      const duplicate = await prisma.user.findFirst({ where: { rollNo: updateData.rollNo, id: { not: user.id } } });
      if (duplicate) return res.status(409).json({ success: false, message: "Roll number already exists." });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      include: {
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        room: { select: { id: true, roomNumber: true, floor: true, block: true } },
      },
    });

    await writeAudit(req, "updated", "User", user.id, { username: user.username });
    const { password, ...updatedWO } = updated;
    res.json({
      success: true,
      user: {
        ...updatedWO,
        _id: updated.id,
        hallId: updated.hall ? { ...updated.hall, _id: updated.hall.id } : updated.hallId,
        roomId: updated.room ? { ...updated.room, _id: updated.room.id } : updated.roomId,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const transferStudentForAdmin = async (req, res) => {
  try {
    const { hallId } = req.body;
    const student = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!student || student.role !== "student") return res.status(404).json({ success: false, message: "Student not found." });
    if (!hallId) return res.status(400).json({ success: false, message: "Destination hall is required." });

    const destinationHall = await prisma.hall.findUnique({ where: { id: hallId } });
    if (!destinationHall || !destinationHall.isActive) return res.status(400).json({ success: false, message: "Destination hall is not available." });
    if (student.hallId === destinationHall.id) return res.status(400).json({ success: false, message: "Choose a destination hall different from the student's current hall." });
    if (destinationHall.gender !== student.gender) return res.status(400).json({ success: false, message: "Student gender does not match the destination hall." });

    const previousHallId = student.hallId;
    const previousHall = previousHallId ? await prisma.hall.findUnique({ where: { id: previousHallId } }) : null;

    await prisma.user.update({
      where: { id: student.id },
      data: { hallId: destinationHall.id, roomId: null },
    });

    await closeResidence(student.id);
    await openResidence(student, destinationHall.id, null, req.user.id || req.user._id);
    await Promise.all([updateHallRoomStats(previousHallId), updateHallRoomStats(destinationHall.id)]);

    await writeAudit(req, "transferred", "User", student.id, {
      description: `${student.name} (${student.registrationNo || "no registration number"}) transferred from ${previousHall ? `Hall ${previousHall.hallNumber} - ${previousHall.hallName}` : "unassigned hall"} to Hall ${destinationHall.hallNumber} - ${destinationHall.hallName} (room pending).`,
    });

    const updated = await prisma.user.findUnique({
      where: { id: student.id },
      include: {
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        room: { select: { id: true, roomNumber: true, floor: true, block: true } },
      },
    });

    const { password, ...updatedWO } = updated;
    res.json({ success: true, message: "Student transferred successfully.", user: { ...updatedWO, _id: updated.id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const bulkTransferStudentsForAdmin = async (req, res) => {
  try {
    const { transfers = [] } = req.body;
    if (!Array.isArray(transfers) || transfers.length === 0) return res.status(400).json({ success: false, message: "Select at least one student to transfer." });
    if (transfers.length > 200) return res.status(400).json({ success: false, message: "Transfer at most 200 students at a time." });

    const studentIds = transfers.map((t) => t.studentId);
    const students = await prisma.user.findMany({ where: { id: { in: studentIds }, role: "student" } });
    if (students.length !== transfers.length) return res.status(400).json({ success: false, message: "One or more selected students were not found." });

    const hallIds = [...new Set(transfers.map((t) => String(t.hallId)))];
    if (hallIds.length !== 1) return res.status(400).json({ success: false, message: "Choose exactly one destination hall for a bulk transfer." });
    const halls = await prisma.hall.findMany({ where: { id: { in: hallIds }, isActive: true } });
    const hallsById = new Map(halls.map((h) => [h.id, h]));
    const studentById = new Map(students.map((s) => [s.id, s]));

    for (const transfer of transfers) {
      const student = studentById.get(String(transfer.studentId));
      const hall = hallsById.get(String(transfer.hallId));
      if (!hall) return res.status(400).json({ success: false, message: "A destination hall is unavailable." });
      if (student.hallId === hall.id) return res.status(400).json({ success: false, message: `${student.name} is already assigned to the destination hall.` });
      if (hall.gender !== student.gender) return res.status(400).json({ success: false, message: `${student.name} cannot be moved to a hall for a different gender.` });
    }

    const previousHallIds = new Set();
    for (const transfer of transfers) {
      const student = studentById.get(String(transfer.studentId));
      const hall = hallsById.get(String(transfer.hallId));
      if (student.hallId) previousHallIds.add(student.hallId);

      await prisma.user.update({
        where: { id: student.id },
        data: { hallId: hall.id, roomId: null },
      });

      await closeResidence(student.id);
      await openResidence(student, hall.id, null, req.user.id || req.user._id);
      await writeAudit(req, "transferred", "User", student.id, {
        description: `${student.name} (${student.registrationNo || "no registration number"}) transferred to Hall ${hall.hallNumber} - ${hall.hallName} (room pending).`,
        bulk: true,
      });
    }

    await Promise.all([...new Set([...previousHallIds, ...hallIds])].map((hId) => updateHallRoomStats(hId)));
    res.json({ success: true, count: transfers.length, message: `${transfers.length} students transferred successfully.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const setUserActiveForAdmin = async (req, res) => {
  try {
    const adminId = req.user.id || req.user._id;
    if (String(req.params.id) === String(adminId)) return res.status(400).json({ success: false, message: "You cannot deactivate your own account." });

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: Boolean(req.body.isActive) },
      include: { hall: { select: { id: true, hallName: true, hallNumber: true } } },
    });

    await writeAudit(req, user.isActive ? "activated" : "deactivated", "User", user.id, { username: user.username });
    const { password, ...userWO } = user;
    res.json({ success: true, user: { ...userWO, _id: user.id } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const deleteUserForAdmin = async (req, res) => {
  try {
    const adminId = req.user.id || req.user._id;
    if (String(req.params.id) === String(adminId)) return res.status(400).json({ success: false, message: "You cannot delete your own account." });

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    await prisma.user.delete({ where: { id: user.id } });
    await writeAudit(req, "deleted", "User", user.id, { username: user.username, role: user.role });
    res.json({ success: true, message: "User deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const deleteFinalYearStudentsForAdmin = async (req, res) => {
  try {
    const students = await prisma.user.findMany({ where: { role: "student", currentYear: 4 } });
    if (students.length === 0) return res.status(404).json({ success: false, message: "No final-year students found." });

    const studentIds = students.map((s) => s.id);

    const [certificates, fines, issues] = await Promise.all([
      prisma.certificate.findMany({ where: { studentId: { in: studentIds } }, select: { certificatePdfUrl: true } }),
      prisma.fine.findMany({ where: { studentId: { in: studentIds } }, select: { paymentProofUrl: true } }),
      prisma.issue.findMany({
        where: { OR: [{ reportedById: { in: studentIds } }, { supporters: { some: { userId: { in: studentIds } } } }] },
        select: { attachments: true },
      }),
    ]);

    await Promise.all([
      ...certificates.map((c) => deleteCloudinaryResource(c.certificatePdfUrl)),
      ...fines.map((f) => deleteCloudinaryResource(f.paymentProofUrl)),
      ...issues.flatMap((i) => (i.attachments || []).filter(Boolean).map(deleteCloudinaryResource)),
    ]);

    await prisma.user.deleteMany({ where: { id: { in: studentIds } } });
    await writeAudit(req, "deleted", "User", null, { role: "student", currentYear: 4, count: students.length, relatedRecordsDeleted: true });

    res.json({ success: true, count: students.length, message: `${students.length} final-year students and related records deleted successfully.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete final-year student records." });
  }
};

export const updateProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    let user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (req.file) {
      user = await prisma.user.update({
        where: { id: userId },
        data: { profilePhoto: req.file.filename },
      });
    }

    const { password, ...userWO } = user;
    res.status(200).json({ success: true, user: { ...userWO, _id: user.id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id || req.user._id;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await matchPassword(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        room: { select: { id: true, roomNumber: true, floor: true, block: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { password, ...userWO } = user;
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.status(200).json({
      success: true,
      user: {
        ...userWO,
        _id: user.id,
        hallId: user.hall ? { ...user.hall, _id: user.hall.id } : user.hallId,
        roomId: user.room ? { ...user.room, _id: user.room.id } : user.roomId,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
