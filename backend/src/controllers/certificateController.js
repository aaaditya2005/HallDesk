import prisma from "../config/prisma.js";
import cloudinary from "../config/cloudinary.js";
import { emitHallStaffEvent, emitUserEvent } from "../socket.js";

const PDF_RETENTION_DAYS = 7;
const PDF_RETENTION_MS = PDF_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const writeCertificateAudit = (req, action, certificate, details = {}) =>
  prisma.auditLog.create({
    data: {
      actorId: req.user.id || req.user._id,
      action,
      entity: "Certificate",
      entityId: certificate?.id || certificate?._id || null,
      details: {
        certificateRequestNumber: certificate?.certificateRequestNumber,
        certificateType: certificate?.certificateType,
        studentId: certificate?.studentId,
        hallId: certificate?.hallId,
        ...details,
      },
    },
  });

const normalizeId = (value) => String(value?.id || value?._id || value || "");

const formatCert = (cert) => {
  if (!cert) return null;
  const certificatePdfAvailable = Boolean(cert.certificatePdfDataUri || cert.certificatePdfUrl);

  let timeRemainingMs = null;
  if (cert.certificatePdfExpiresAt) {
    const now = new Date();
    const expiresAt = new Date(cert.certificatePdfExpiresAt);
    timeRemainingMs = Math.max(0, expiresAt.getTime() - now.getTime());
  }

  const { certificatePdfDataUri, ...rest } = cert;

  return {
    ...rest,
    _id: cert.id,
    studentId: cert.student ? { ...cert.student, _id: cert.student.id, roomId: cert.student.room ? { ...cert.student.room, _id: cert.student.room.id } : cert.student.roomId } : cert.studentId,
    hallId: cert.hall ? { ...cert.hall, _id: cert.hall.id } : cert.hallId,
    approvedBy: cert.approvedBy ? { ...cert.approvedBy, _id: cert.approvedBy.id } : cert.approvedById,
    certificatePdfAvailable,
    timeRemainingMs,
  };
};

const dataUriToBuffer = (dataUri) => {
  if (!dataUri || typeof dataUri !== "string") return null;
  const match = dataUri.match(/^data:application\/pdf;base64,(.*)$/i) || dataUri.match(/^data:.*;base64,(.*)$/i);
  if (!match) return Buffer.from(dataUri);
  return Buffer.from(match[1], "base64");
};

const getCertificatePdfBuffer = async (certificate) => {
  if (certificate.certificatePdfDataUri) {
    return dataUriToBuffer(certificate.certificatePdfDataUri);
  }

  if (!certificate.certificatePdfUrl) {
    return null;
  }

  const pdfResponse = await fetch(certificate.certificatePdfUrl);
  if (!pdfResponse.ok) {
    return null;
  }

  return Buffer.from(await pdfResponse.arrayBuffer());
};

const deleteCloudinaryResource = async (resourceUrl) => {
  if (!resourceUrl || typeof resourceUrl !== "string") return;

  try {
    const url = new URL(resourceUrl);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const uploadIndex = pathParts.indexOf("upload");

    if (uploadIndex === -1) return;

    const afterUpload = [...pathParts.slice(uploadIndex + 1)];
    if (afterUpload[0]?.startsWith("v")) afterUpload.shift();

    const publicId = afterUpload.join("/").replace(/\.[^/.]+$/, "");

    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
  } catch (error) {
    console.warn("Failed to delete Cloudinary resource:", error.message);
  }
};

const uploadPdfToCloudinary = async (pdfDataUri, certificateNumber) => {
  if (!pdfDataUri || typeof pdfDataUri !== "string") {
    throw new Error("PDF content is required");
  }

  const buffer = dataUriToBuffer(pdfDataUri);
  if (!buffer) {
    throw new Error("PDF content is invalid");
  }

  const fileName = `${certificateNumber || Date.now()}-certificate`;

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "halldesk/certificates",
        resource_type: "raw",
        public_id: fileName,
        format: "pdf",
        overwrite: true,
        use_filename: true,
        unique_filename: false,
      },
      (error, uploadResult) => {
        if (error) return reject(error);
        resolve(uploadResult);
      }
    );

    stream.end(buffer);
  });

  return result.secure_url;
};

export const cleanupExpiredCertificatePdfs = async () => {
  const now = new Date();
  const expiredCertificates = await prisma.certificate.findMany({
    where: {
      certificatePdfExpiresAt: { lte: now },
      OR: [{ certificatePdfUrl: { not: null } }, { certificatePdfDataUri: { not: null } }],
    },
  });

  for (const certificate of expiredCertificates) {
    await deleteCloudinaryResource(certificate.certificatePdfUrl);
    await prisma.certificate.update({
      where: { id: certificate.id },
      data: {
        certificatePdfUrl: null,
        certificatePdfDataUri: null,
        certificatePdfDeletedAt: now,
      },
    });
  }
};

const generateCertificateNumber = async (certificateType) => {
  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const todayCount = await prisma.certificate.count({
    where: {
      certificateType,
      createdAt: { gte: startOfDay, lt: endOfDay },
    },
  });

  const typePrefix = certificateType === "Leave" ? "LC" : "BC";
  return `${typePrefix}-${datePart}-${String(todayCount + 1).padStart(3, "0")}`;
};

export const getStudentCertificates = async (req, res) => {
  try {
    await cleanupExpiredCertificatePdfs();

    const userId = req.user.id || req.user._id;
    const certificates = await prisma.certificate.findMany({
      where: { studentId: userId },
      include: {
        student: { select: { id: true, name: true, registrationNo: true, branch: true, hallId: true, email: true, phone: true, department: true, course: true, currentYear: true, roomId: true, room: { select: { id: true, roomNumber: true, floor: true, block: true } } } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      certificates: certificates.map(formatCert),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getHallCertificates = async (req, res) => {
  try {
    await cleanupExpiredCertificatePdfs();

    const wardenHallId = req.user.hallId?.id || req.user.hallId;
    const currentStudents = await prisma.user.findMany({ where: { hallId: wardenHallId, role: "student" }, select: { id: true } });
    const historicalStudents = await prisma.residenceHistory.findMany({ where: { hallId: wardenHallId }, select: { studentId: true } });
    const visibleStudentIds = [...new Set([...currentStudents.map((s) => s.id), ...historicalStudents.map((h) => h.studentId)])];

    const certificates = await prisma.certificate.findMany({
      where: {
        OR: [{ hallId: wardenHallId }, { studentId: { in: visibleStudentIds } }],
      },
      include: {
        student: { select: { id: true, name: true, registrationNo: true, branch: true, roomId: true, currentYear: true, course: true, room: { select: { id: true, roomNumber: true, floor: true, block: true } } } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      certificates: certificates.map(formatCert),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getCertificateById = async (req, res) => {
  try {
    await cleanupExpiredCertificatePdfs();

    const userId = req.user.id || req.user._id;
    const certificate = await prisma.certificate.findUnique({
      where: { id: req.params.id },
      include: {
        student: { select: { id: true, name: true, registrationNo: true, branch: true, hallId: true, email: true, phone: true, department: true, course: true, currentYear: true, roomId: true, room: { select: { id: true, roomNumber: true, floor: true, block: true } } } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    if (req.user.role === "student" && String(certificate.studentId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (req.user.role === "warden") {
      const certHallId = normalizeId(certificate.hallId);
      const userHallId = normalizeId(req.user.hallId);

      if (certHallId !== userHallId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    res.status(200).json({
      success: true,
      certificate: formatCert(certificate),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const requestCertificate = async (req, res) => {
  try {
    const { certificateType, leaveFromDate, leaveToDate, reason, purpose, parentPhone } = req.body;
    const userId = req.user.id || req.user._id;

    if (!certificateType) {
      return res.status(400).json({
        success: false,
        message: "Certificate type is required",
      });
    }

    if (certificateType === "Leave" && (!leaveFromDate || !leaveToDate)) {
      return res.status(400).json({
        success: false,
        message: "Leave dates are required for Leave Certificate",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, hallId: true },
    });

    if (!user || !user.hallId) {
      return res.status(400).json({
        success: false,
        message: "Student must be assigned to a hall",
      });
    }

    const certificateNumber = await generateCertificateNumber(certificateType);

    const certificate = await prisma.certificate.create({
      data: {
        certificateRequestNumber: certificateNumber,
        certificateType,
        studentId: userId,
        hallId: user.hallId,
        leaveFromDate: leaveFromDate ? new Date(leaveFromDate) : null,
        leaveToDate: leaveToDate ? new Date(leaveToDate) : null,
        parentPhone: parentPhone || null,
        reason: reason || null,
        purpose: purpose || null,
        status: "Pending",
      },
      include: {
        student: { select: { id: true, name: true, registrationNo: true, branch: true, hallId: true, email: true, phone: true, department: true, course: true, currentYear: true, roomId: true, room: { select: { id: true, roomNumber: true, floor: true, block: true } } } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    const formattedCert = formatCert(certificate);

    emitHallStaffEvent(user.hallId, "certificate-created", formattedCert);
    emitUserEvent(userId, "certificate-created", formattedCert);
    await writeCertificateAudit(req, "requested", certificate, { status: certificate.status });

    res.status(201).json({
      success: true,
      message: "Certificate request submitted successfully",
      certificate: formattedCert,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const approveCertificate = async (req, res) => {
  try {
    const { certificatePdfUrl, digitalSignatureUrl, stampUrl, remarks } = req.body;
    const userId = req.user.id || req.user._id;

    if (!remarks || typeof remarks !== "string" || remarks.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Remarks are required when approving a certificate",
      });
    }

    if (!digitalSignatureUrl || typeof digitalSignatureUrl !== "string" || digitalSignatureUrl.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Digital signature is required when approving a certificate",
      });
    }

    if (!stampUrl || typeof stampUrl !== "string" || stampUrl.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Stamp is required when approving a certificate",
      });
    }

    if (!certificatePdfUrl || typeof certificatePdfUrl !== "string") {
      return res.status(400).json({
        success: false,
        message: "Generated certificate PDF is required when approving a certificate.",
      });
    }

    const certificate = await prisma.certificate.findUnique({ where: { id: req.params.id } });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    if (certificate.status !== "Pending") {
      return res.status(409).json({
        success: false,
        message: "Only pending certificates can be approved.",
      });
    }

    if (req.user.role === "warden") {
      const certHallId = normalizeId(certificate.hallId);
      const userHallId = normalizeId(req.user.hallId);

      if (certHallId !== userHallId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    let uploadedPdfUrl = certificate.certificatePdfUrl || null;
    let pdfDataUri = certificate.certificatePdfDataUri || null;

    if (certificatePdfUrl && !certificatePdfUrl.startsWith("data:application/pdf;base64,")) {
      return res.status(400).json({
        success: false,
        message: "Certificate PDF must be a generated PDF data URI.",
      });
    }

    if (certificatePdfUrl) {
      if (certificate.certificatePdfUrl && certificate.certificatePdfUrl !== certificatePdfUrl) {
        await deleteCloudinaryResource(certificate.certificatePdfUrl);
      }

      if (certificatePdfUrl.startsWith("data:")) {
        pdfDataUri = certificatePdfUrl;
        uploadedPdfUrl = await uploadPdfToCloudinary(certificatePdfUrl, certificate.certificateRequestNumber);
      } else {
        uploadedPdfUrl = certificatePdfUrl;
        pdfDataUri = null;
      }
    }

    const updatedCert = await prisma.certificate.update({
      where: { id: certificate.id },
      data: {
        status: "Approved",
        approvedById: userId,
        approvedAt: new Date(),
        certificatePdfUrl: uploadedPdfUrl,
        certificatePdfDataUri: pdfDataUri,
        certificatePdfFirstDownloadedAt: new Date(),
        certificatePdfExpiresAt: new Date(Date.now() + PDF_RETENTION_MS),
        certificatePdfDeletedAt: null,
        digitalSignatureUrl: digitalSignatureUrl || null,
        stampUrl: stampUrl || null,
        remarks: remarks || null,
      },
      include: {
        student: { select: { id: true, name: true, registrationNo: true, branch: true, hallId: true, email: true, phone: true, department: true, course: true, currentYear: true, roomId: true, room: { select: { id: true, roomNumber: true, floor: true, block: true } } } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    const formattedCert = formatCert(updatedCert);

    emitHallStaffEvent(certificate.hallId, "certificate-updated", formattedCert);
    emitUserEvent(certificate.studentId, "certificate-updated", formattedCert);
    await writeCertificateAudit(req, "approved", certificate, { status: updatedCert.status });

    res.status(200).json({
      success: true,
      message: "Certificate approved successfully",
      certificate: formattedCert,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const rejectCertificate = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason || typeof rejectionReason !== "string" || rejectionReason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required when rejecting a certificate",
      });
    }

    const certificate = await prisma.certificate.findUnique({ where: { id: req.params.id } });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    if (certificate.status !== "Pending") {
      return res.status(409).json({
        success: false,
        message: "Only pending certificates can be rejected.",
      });
    }

    if (req.user.role === "warden") {
      const certHallId = normalizeId(certificate.hallId);
      const userHallId = normalizeId(req.user.hallId);

      if (certHallId !== userHallId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    const updatedCert = await prisma.certificate.update({
      where: { id: certificate.id },
      data: {
        status: "Rejected",
        remarks: rejectionReason || certificate.remarks || null,
        rejectionReason: rejectionReason || certificate.rejectionReason || null,
      },
      include: {
        student: { select: { id: true, name: true, registrationNo: true, branch: true, roomId: true, currentYear: true, course: true, room: { select: { id: true, roomNumber: true, floor: true, block: true } } } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    const formattedCert = formatCert(updatedCert);

    emitHallStaffEvent(certificate.hallId, "certificate-updated", formattedCert);
    emitUserEvent(certificate.studentId, "certificate-updated", formattedCert);
    await writeCertificateAudit(req, "rejected", certificate, { status: updatedCert.status, rejectionReason });

    res.status(200).json({
      success: true,
      message: "Certificate rejected",
      certificate: formattedCert,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const deleteCertificate = async (req, res) => {
  try {
    const deletionReason = typeof req.body?.deletionReason === "string" ? req.body.deletionReason.trim() : "";
    const userId = req.user.id || req.user._id;
    const certificate = await prisma.certificate.findUnique({ where: { id: req.params.id } });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    if (req.user.role === "student" && certificate.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending certificates can be deleted by students",
      });
    }

    if (req.user.role === "student" && String(certificate.studentId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (req.user.role === "warden") {
      if (!deletionReason) {
        return res.status(400).json({
          success: false,
          message: "A deletion remark is required for warden certificate deletion.",
        });
      }

      const certHallId = normalizeId(certificate.hallId);
      const userHallId = normalizeId(req.user.hallId);

      if (certHallId !== userHallId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    if (certificate.certificatePdfUrl) {
      await deleteCloudinaryResource(certificate.certificatePdfUrl);
    }

    await prisma.certificate.delete({ where: { id: req.params.id } });

    if (certificate.hallId) {
      emitHallStaffEvent(certificate.hallId, "certificate-deleted", { certificateId: req.params.id });
      emitUserEvent(certificate.studentId, "certificate-deleted", { certificateId: req.params.id });
    }
    await writeCertificateAudit(req, "deleted", certificate, {
      previousStatus: certificate.status,
      deletionReason: deletionReason || null,
    });

    res.status(200).json({
      success: true,
      message: "Certificate request deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const uploadStampAndSignature = async (req, res) => {
  try {
    const uploadedFiles = {
      stamp: null,
      signature: null,
    };

    if (req.files) {
      for (const file of req.files) {
        const fileData = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        const result = await cloudinary.uploader.upload(fileData, {
          folder: "halldesk/certificates",
          resource_type: "auto",
          transformation: [{ quality: "auto" }],
        });

        if (file.fieldname === "stamp") {
          uploadedFiles.stamp = result.secure_url;
        } else if (file.fieldname === "signature") {
          uploadedFiles.signature = result.secure_url;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Files uploaded successfully",
      files: uploadedFiles,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const downloadCertificate = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const certificate = await prisma.certificate.findUnique({ where: { id: req.params.id } });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    if (req.user.role === "student" && String(certificate.studentId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (req.user.role === "warden" || req.user.role === "admin") {
      const certHallId = normalizeId(certificate.hallId);
      const userHallId = normalizeId(req.user.hallId);

      if (certHallId !== userHallId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    if (certificate.status !== "Approved" || (!certificate.certificatePdfUrl && !certificate.certificatePdfDataUri)) {
      return res.status(400).json({
        success: false,
        message: "Approved certificate PDF is not available",
      });
    }

    if (certificate.certificatePdfExpiresAt && certificate.certificatePdfExpiresAt <= new Date()) {
      await deleteCloudinaryResource(certificate.certificatePdfUrl);
      await prisma.certificate.update({
        where: { id: certificate.id },
        data: {
          certificatePdfUrl: null,
          certificatePdfDataUri: null,
          certificatePdfDeletedAt: new Date(),
        },
      });

      return res.status(410).json({
        success: false,
        message: "Certificate PDF retention period has expired",
      });
    }

    res.status(200).json({
      success: true,
      message: "Certificate download window is active",
      pdfUrl: certificate.certificatePdfUrl,
      certificatePdfFirstDownloadedAt: certificate.certificatePdfFirstDownloadedAt,
      certificatePdfExpiresAt: certificate.certificatePdfExpiresAt,
    });
    await writeCertificateAudit(req, "downloaded", certificate, { status: certificate.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const streamCertificatePdf = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const certificate = await prisma.certificate.findUnique({ where: { id: req.params.id } });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    if (req.user.role === "student" && String(certificate.studentId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (req.user.role === "warden" || req.user.role === "admin") {
      const certHallId = normalizeId(certificate.hallId);
      const userHallId = normalizeId(req.user.hallId);

      if (certHallId !== userHallId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    if (certificate.status !== "Approved" || (!certificate.certificatePdfUrl && !certificate.certificatePdfDataUri)) {
      return res.status(400).json({
        success: false,
        message: "Approved certificate PDF is not available",
      });
    }

    if (certificate.certificatePdfExpiresAt && certificate.certificatePdfExpiresAt <= new Date()) {
      await deleteCloudinaryResource(certificate.certificatePdfUrl);
      await prisma.certificate.update({
        where: { id: certificate.id },
        data: {
          certificatePdfUrl: null,
          certificatePdfDataUri: null,
          certificatePdfDeletedAt: new Date(),
        },
      });

      return res.status(410).json({
        success: false,
        message: "Certificate PDF retention period has expired",
      });
    }

    const pdfBuffer = await getCertificatePdfBuffer(certificate);

    if (!pdfBuffer) {
      await prisma.certificate.update({
        where: { id: certificate.id },
        data: {
          certificatePdfUrl: null,
          certificatePdfDeletedAt: new Date(),
        },
      });

      return res.status(409).json({
        success: false,
        message: "This certificate PDF was saved with an old broken storage link. Please ask the warden to regenerate it.",
      });
    }

    const fileName = `${certificate.certificateRequestNumber || "certificate"}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    await writeCertificateAudit(req, "downloaded", certificate, { status: certificate.status });
    return res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
