import express from "express";
import {
  issueFine,
  getWardenFines,
  getMyFines,
  getFineById,
  downloadPaymentProof,
  uploadPaymentProof,
  updateFineStatus,
  deleteFine,
  searchStudents,
} from "../controllers/fineController.js";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { requireObjectId } from "../middleware/validation.js";
import { proofUpload } from "../config/multer.js";

const router = express.Router();

// Warden: Issue a fine
router.post("/issue", protect, authorizeRoles("warden", "admin"), issueFine);

// Warden: Get all fines for their hall
router.get("/warden", protect, authorizeRoles("warden", "admin"), getWardenFines);

// Recipient: Get fines issued to their own account
router.get("/my", protect, authorizeRoles("student", "mess_manager"), getMyFines);
router.get("/student", protect, authorizeRoles("student"), getMyFines);

// Student or warden: Open a payment proof through an authenticated download URL
router.get("/:fineId/payment-proof", protect, requireObjectId("fineId"), authorizeRoles("student", "mess_manager", "warden", "admin"), downloadPaymentProof);

// Search students by registration number (for issuing fines)
router.get("/search/students", protect, authorizeRoles("warden", "admin"), searchStudents);

// Get single fine by ID
router.get("/:id", protect, requireObjectId("id"), authorizeRoles("student", "mess_manager", "warden", "admin"), getFineById);

// Student: Upload payment proof
router.post("/:fineId/upload-proof", protect, authorizeRoles("student", "mess_manager"), requireObjectId("fineId"), proofUpload.single("paymentProof"), uploadPaymentProof);

// Warden: Update fine status (mark paid, waive, etc.)
router.patch("/:fineId/status", protect, authorizeRoles("warden", "admin"), requireObjectId("fineId"), updateFineStatus);

// Warden: Delete fine
router.delete("/:fineId", protect, authorizeRoles("warden", "admin"), requireObjectId("fineId"), deleteFine);

export default router;
