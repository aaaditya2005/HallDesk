import express from "express";
import {
  getStudentCertificates,
  getHallCertificates,
  getCertificateById,
  requestCertificate,
  approveCertificate,
  rejectCertificate,
  deleteCertificate,
  uploadStampAndSignature,
  downloadCertificate,
  streamCertificatePdf,
} from "../controllers/certificateController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import multer from "multer";
import { requireObjectId } from "../middleware/validation.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get certificates
router.get(
  "/student",
  authMiddleware,
  authorizeRoles("student"),
  getStudentCertificates
);

router.get(
  "/hall",
  authMiddleware,
  authorizeRoles("warden"),
  getHallCertificates
);

router.get(
  "/:id/file",
  authMiddleware,
  requireObjectId("id"),
  streamCertificatePdf
);

router.get(
  "/:id",
  authMiddleware,
  requireObjectId("id"),
  getCertificateById
);

// Request certificate (student)
router.post(
  "/request",
  authMiddleware,
  authorizeRoles("student"),
  requestCertificate
);

// Approve certificate (warden/admin)
router.patch(
  "/:id/approve",
  authMiddleware,
  requireObjectId("id"),
  authorizeRoles("warden", "admin"),
  approveCertificate
);

// Reject certificate (warden/admin)
router.patch(
  "/:id/reject",
  authMiddleware,
  requireObjectId("id"),
  authorizeRoles("warden", "admin"),
  rejectCertificate
);

// Download and remove approved certificate PDF
router.patch(
  "/:id/download",
  authMiddleware,
  requireObjectId("id"),
  downloadCertificate
);

// Delete certificate (student/warden/admin)
router.delete(
  "/:id",
  authMiddleware,
  requireObjectId("id"),
  authorizeRoles("student", "warden", "admin"),
  deleteCertificate
);

// Upload stamp and signature
router.post(
  "/upload/stamp-signature",
  authMiddleware,
  authorizeRoles("warden", "admin"),
  upload.array("files", 2),
  uploadStampAndSignature
);

export default router;
