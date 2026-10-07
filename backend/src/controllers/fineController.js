import prisma from "../config/prisma.js";
import cloudinary, { uploadToCloudinary, deleteCloudinaryResource } from "../config/cloudinary.js";
import { emitHallStaffEvent, emitUserEvent } from "../socket.js";

const emitFineEvent = (hallId, recipientId, eventName, payload) => {
  emitHallStaffEvent(hallId, eventName, payload);
  emitUserEvent(recipientId, eventName, payload);
};

const normalizeId = (id) => String(id?.id || id?._id || id || "");

const formatFine = (fine) => {
  if (!fine) return null;
  return {
    ...fine,
    _id: fine.id,
    studentId: fine.student ? { ...fine.student, _id: fine.student.id } : fine.studentId,
    issuedBy: fine.issuedBy ? { ...fine.issuedBy, _id: fine.issuedBy.id } : fine.issuedById,
    hallId: fine.hall ? { ...fine.hall, _id: fine.hall.id } : fine.hallId,
    hasPaymentProof: Boolean(fine.paymentProofUrl),
  };
};

const generateFineNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `FINE-${timestamp}-${random}`;
};

const getPrivateProofUrl = (paymentProofUrl) => {
  const url = new URL(paymentProofUrl);
  const urlParts = url.pathname.split("/").filter(Boolean);
  const resourceTypeIndex = urlParts.findIndex((part) => ["image", "raw", "video"].includes(part));
  const uploadIndex = urlParts.indexOf("upload", resourceTypeIndex);
  const publicIdParts = urlParts.slice(uploadIndex + 1);

  if (/^s--.*--$/.test(publicIdParts[0])) publicIdParts.shift();
  if (/^v\d+$/.test(publicIdParts[0])) publicIdParts.shift();

  const resourceType = urlParts[resourceTypeIndex];
  const fileName = publicIdParts[publicIdParts.length - 1];
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "pdf";

  if (resourceType === "raw") {
    return cloudinary.utils.private_download_url(publicIdParts.join("/"), undefined, {
      resource_type: resourceType,
      type: "upload",
      attachment: false,
    });
  }

  publicIdParts[publicIdParts.length - 1] = fileName.replace(/\.[^.]+$/, "");

  return cloudinary.utils.private_download_url(publicIdParts.join("/"), extension, {
    resource_type: resourceType,
    type: "upload",
    attachment: false,
  });
};

export const issueFine = async (req, res) => {
  try {
    const { studentId, amount, reason, paymentProcedure, paymentDeadline, description } = req.body;
    const userId = req.user.id || req.user._id;

    if (!studentId || !amount || !reason || !paymentDeadline) {
      return res.status(400).json({
        success: false,
        message: "Student ID, amount, reason, and payment deadline are required.",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Fine amount must be greater than 0.",
      });
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, registrationNo: true, name: true, hallId: true },
    });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    if (req.user.role === "warden") {
      const wardenHallId = req.user.hallId?.id || req.user.hallId;
      if (!wardenHallId) {
        return res.status(403).json({
          success: false,
          message: "Your warden profile is not assigned to any hall.",
        });
      }

      if (!student.hallId) {
        return res.status(403).json({
          success: false,
          message: "This student is not assigned to any hall.",
        });
      }

      if (String(wardenHallId) !== String(student.hallId)) {
        return res.status(403).json({
          success: false,
          message: "You can only issue fines to students in your hall.",
        });
      }
    }

    const fine = await prisma.fine.create({
      data: {
        fineNumber: generateFineNumber(),
        studentId: student.id,
        hallId: student.hallId,
        amount: Number(amount),
        reason,
        paymentProcedure: paymentProcedure || "Both",
        paymentDeadline: new Date(paymentDeadline),
        issuedById: userId,
        description: description || null,
      },
      include: {
        student: { select: { id: true, name: true, registrationNo: true } },
        issuedBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    const formattedFine = formatFine(fine);
    emitFineEvent(student.hallId, student.id, "fine-created", formattedFine);

    res.status(201).json({
      success: true,
      message: "Fine issued successfully.",
      fine: formattedFine,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getWardenFines = async (req, res) => {
  try {
    let hallId;
    if (req.user.role === "warden") {
      hallId = req.user.hallId?.id || req.user.hallId;
    } else if (req.user.role === "admin") {
      hallId = req.query.hallId;
    }

    if (!hallId) {
      return res.status(400).json({
        success: false,
        message: "Hall ID is required.",
      });
    }

    const currentStudents = await prisma.user.findMany({ where: { hallId, role: "student" }, select: { id: true } });
    const historicalStudents = await prisma.residenceHistory.findMany({ where: { hallId }, select: { studentId: true } });
    const visibleStudentIds = [...new Set([...currentStudents.map((s) => s.id), ...historicalStudents.map((h) => h.studentId)])];

    const fines = await prisma.fine.findMany({
      where: {
        OR: [{ hallId }, { studentId: { in: visibleStudentIds } }],
      },
      include: {
        student: { select: { id: true, name: true, registrationNo: true, managerId: true, role: true, roomId: true, currentYear: true } },
        issuedBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedFines = fines.map(formatFine);
    res.status(200).json({
      success: true,
      fines: formattedFines,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getMyFines = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const fines = await prisma.fine.findMany({
      where: { studentId: userId },
      include: {
        student: { select: { id: true, name: true, registrationNo: true, managerId: true, role: true } },
        issuedBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      fines: fines.map(formatFine),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getFineById = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const fine = await prisma.fine.findUnique({
      where: { id: req.params.id },
      include: {
        student: { select: { id: true, name: true, registrationNo: true, roomId: true } },
        issuedBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    if (!fine) {
      return res.status(404).json({
        success: false,
        message: "Fine not found.",
      });
    }

    if (["student", "mess_manager"].includes(req.user.role) && normalizeId(fine.studentId) !== normalizeId(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    res.status(200).json({
      success: true,
      fine: formatFine(fine),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const downloadPaymentProof = async (req, res) => {
  try {
    const fine = await prisma.fine.findUnique({
      where: { id: req.params.fineId },
      select: { studentId: true, hallId: true, paymentProofUrl: true, paymentProofFileName: true },
    });

    if (!fine || !fine.paymentProofUrl) {
      return res.status(404).json({ success: false, message: "Payment proof not found." });
    }

    const userId = req.user.id || req.user._id;
    const userHallId = req.user.hallId?.id || req.user.hallId;

    if (req.user.role === "student") {
      if (!userHallId || normalizeId(fine.hallId) !== normalizeId(userHallId)) {
        return res.status(403).json({ success: false, message: "You can only view payment proofs from your hall." });
      }
    }

    if (req.user.role === "mess_manager" && normalizeId(fine.studentId) !== normalizeId(userId)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    if (req.user.role === "warden") {
      if (!userHallId || String(userHallId) !== String(fine.hallId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }
    }

    const proofResponse = await fetch(getPrivateProofUrl(fine.paymentProofUrl));
    if (!proofResponse.ok) {
      return res.status(502).json({
        success: false,
        message: "Cloudinary could not provide the payment proof.",
      });
    }

    const contentType = proofResponse.headers.get("content-type") || "application/octet-stream";
    const contentLength = proofResponse.headers.get("content-length");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${fine.paymentProofFileName || "payment-proof.pdf"}"`);
    if (contentLength) res.setHeader("Content-Length", contentLength);

    return res.send(Buffer.from(await proofResponse.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to open payment proof." });
  }
};

export const uploadPaymentProof = async (req, res) => {
  try {
    const { fineId } = req.params;
    const file = req.file;
    const userId = req.user.id || req.user._id;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Payment proof file is required.",
      });
    }

    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "File size must not exceed 5MB.",
      });
    }

    const fine = await prisma.fine.findUnique({ where: { id: fineId } });

    if (!fine) {
      return res.status(404).json({
        success: false,
        message: "Fine not found.",
      });
    }

    if (normalizeId(fine.studentId) !== normalizeId(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    if (fine.paymentProofUrl) {
      try {
        await deleteCloudinaryResource(fine.paymentProofUrl);
      } catch (err) {
        console.warn("Could not delete old payment proof:", err);
      }
    }

    const isPdf = file.mimetype === "application/pdf";
    const resourceType = "image";
    const publicId = `fine-proof-${fineId}`;

    const cloudinaryResult = await uploadToCloudinary(file.buffer, publicId, "fine_proofs", resourceType);

    const paymentProofUrl = cloudinary.url(`fine_proofs/${publicId}`, {
      secure: true,
      sign_url: true,
      resource_type: resourceType,
      type: "upload",
      version: cloudinaryResult.version,
      format: isPdf ? "pdf" : undefined,
    });

    const updatedFine = await prisma.fine.update({
      where: { id: fine.id },
      data: {
        paymentProofUrl,
        paymentProofFileName: file.originalname,
        status: "Verification Pending",
        paidAt: null,
      },
      include: {
        student: { select: { id: true, name: true, registrationNo: true } },
        issuedBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    const formattedFine = formatFine(updatedFine);
    emitFineEvent(fine.hallId, fine.studentId, "fine-updated", formattedFine);

    res.status(200).json({
      success: true,
      message: "Payment proof uploaded successfully. Pending warden verification.",
      fine: formattedFine,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateFineStatus = async (req, res) => {
  try {
    const { fineId } = req.params;
    const { status, remarks } = req.body;

    if (!status || !["Pending", "Verification Pending", "Paid", "Waived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required (Pending, Verification Pending, Paid, Waived).",
      });
    }

    const fine = await prisma.fine.findUnique({ where: { id: fineId } });

    if (!fine) {
      return res.status(404).json({
        success: false,
        message: "Fine not found.",
      });
    }

    if (req.user.role === "warden") {
      const wardenHallId = req.user.hallId?.id || req.user.hallId;
      if (String(wardenHallId) !== String(fine.hallId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Fine belongs to a different hall.",
        });
      }
    }

    const updateData = { status };

    if (status === "Paid") {
      if (!fine.paidAt) {
        updateData.paidAt = new Date();
      }
      updateData.remarks = remarks || null;
    } else if (status === "Pending") {
      if (fine.paymentProofUrl) {
        try {
          await deleteCloudinaryResource(fine.paymentProofUrl);
        } catch (err) {
          console.warn("Could not delete payment proof on reject:", err);
        }
      }
      updateData.paymentProofUrl = null;
      updateData.paymentProofFileName = null;
      updateData.paidAt = null;
      updateData.remarks = remarks || null;
    } else {
      if (remarks) {
        updateData.remarks = remarks;
      }
    }

    const updatedFine = await prisma.fine.update({
      where: { id: fine.id },
      data: updateData,
      include: {
        student: { select: { id: true, name: true, registrationNo: true } },
        issuedBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    const formattedFine = formatFine(updatedFine);
    emitFineEvent(fine.hallId, fine.studentId, "fine-updated", formattedFine);

    res.status(200).json({
      success: true,
      message: "Fine status updated successfully.",
      fine: formattedFine,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const deleteFine = async (req, res) => {
  try {
    const { fineId } = req.params;
    const fine = await prisma.fine.findUnique({ where: { id: fineId } });

    if (!fine) {
      return res.status(404).json({
        success: false,
        message: "Fine not found.",
      });
    }

    if (fine.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending fines can be deleted.",
      });
    }

    if (req.user.role === "warden") {
      const wardenHallId = req.user.hallId?.id || req.user.hallId;
      if (String(wardenHallId) !== String(fine.hallId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Fine belongs to a different hall.",
        });
      }
    }

    if (fine.paymentProofUrl) {
      try {
        await deleteCloudinaryResource(fine.paymentProofUrl);
      } catch (err) {
        console.warn("Could not delete payment proof:", err);
      }
    }

    await prisma.fine.delete({ where: { id: fineId } });
    emitFineEvent(fine.hallId, fine.studentId, "fine-deleted", { fineId });

    res.status(200).json({
      success: true,
      message: "Fine deleted successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const searchStudents = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters.",
      });
    }

    let hallId;
    if (req.user.role === "warden") {
      hallId = req.user.hallId?.id || req.user.hallId;
      if (!hallId) {
        return res.status(403).json({
          success: false,
          message: "Your warden profile is not assigned to any hall.",
        });
      }
    } else if (req.user.role === "admin") {
      hallId = req.query.hallId;
    }

    if (!hallId) {
      return res.status(400).json({
        success: false,
        message: "Hall ID is required.",
      });
    }

    const students = await prisma.user.findMany({
      where: {
        hallId,
        role: { in: ["student", "mess_manager"] },
        OR: [
          { registrationNo: { contains: query, mode: "insensitive" } },
          { managerId: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, registrationNo: true, managerId: true, roomId: true, currentYear: true, role: true },
      take: 10,
    });

    const formattedStudents = students.map((s) => ({ ...s, _id: s.id }));
    res.status(200).json({
      success: true,
      students: formattedStudents,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
