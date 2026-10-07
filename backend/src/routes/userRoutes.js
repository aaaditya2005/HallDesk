import express from "express";
import { body } from "express-validator";
import protect from "../middleware/authMiddleware.js";
import { rejectInvalidRequest } from "../middleware/validation.js";
import {
  createUserForAdmin,
  getAllUsersForAdmin,
  getStudentsForWarden,
  updatePassword,
  getProfile,
  updateUserForAdmin,
  transferStudentForAdmin,
  bulkTransferStudentsForAdmin,
  setUserActiveForAdmin,
  deleteUserForAdmin,
  deleteFinalYearStudentsForAdmin,
} from "../controllers/userController.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { requireObjectId } from "../middleware/validation.js";

const router = express.Router();

router.get("/admin/all", protect, authorizeRoles("admin"), getAllUsersForAdmin);
router.get("/warden/students", protect, authorizeRoles("warden"), getStudentsForWarden);
router.post("/admin/create", protect, authorizeRoles("admin"), createUserForAdmin);
router.patch("/admin/:id", protect, requireObjectId("id"), authorizeRoles("admin"), updateUserForAdmin);
router.post("/admin/:id/transfer", protect, requireObjectId("id"), authorizeRoles("admin"), transferStudentForAdmin);
router.post("/admin/bulk-transfer", protect, authorizeRoles("admin"), bulkTransferStudentsForAdmin);
router.patch("/admin/:id/status", protect, requireObjectId("id"), authorizeRoles("admin"), setUserActiveForAdmin);
router.delete("/admin/final-year", protect, authorizeRoles("admin"), deleteFinalYearStudentsForAdmin);
router.delete("/admin/:id", protect, requireObjectId("id"), authorizeRoles("admin"), deleteUserForAdmin);
router.get("/profile", protect, getProfile);
router.put("/profile/password", protect, [
  body("currentPassword").isString().notEmpty().withMessage("Current password is required."),
  body("newPassword").isString().notEmpty().withMessage("New password is required.").bail().isLength({ max: 128 }).withMessage("Password must be at most 128 characters."),
], rejectInvalidRequest, updatePassword);

export default router;
