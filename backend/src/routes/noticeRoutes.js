import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { requireObjectId } from "../middleware/validation.js";
import upload from "../config/multer.js";
import {
  createNotice,
  getNotices,
  getNotice,
  updateNotice,
  expireNotice,
  deleteNotice,
} from "../controllers/noticeController.js";

const router = express.Router();

router.post("/", protect, authorizeRoles("admin", "warden"), upload.array("attachments", 2), createNotice);
router.get("/", protect, getNotices);
router.get("/:id", protect, requireObjectId("id"), getNotice);
router.put("/:id", protect, requireObjectId("id"), authorizeRoles("admin", "warden"), upload.array("attachments", 2), updateNotice);
router.patch("/:id/expire", protect, requireObjectId("id"), authorizeRoles("admin", "warden"), expireNotice);
router.delete("/:id", protect, requireObjectId("id"), authorizeRoles("admin", "warden"), deleteNotice);

export default router;
