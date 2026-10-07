import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { issueUpload } from "../config/multer.js";
import { requireObjectId } from "../middleware/validation.js";

import {
  createIssue,
  getAllIssues,
  getMyIssues,
  getIssueById,
  updateIssueStatus,
  getIssuesForWarden,
  updateIssue,
  deleteIssue,
} from "../controllers/issueController.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("student"),
  issueUpload.array("attachments", 2),
  createIssue
);

router.patch("/:id/status",
  protect,
  requireObjectId("id"),
  authorizeRoles(
    "warden",
    "admin"
  ),
  updateIssueStatus
);

router.get( "/warden",
  protect,
  authorizeRoles(
    "warden",
    "admin"
  ),
  getIssuesForWarden
);

router.get("/my",
  protect,
  authorizeRoles("student"),
  getMyIssues
);

router.put(
  "/:id",
  protect,
  requireObjectId("id"),
  authorizeRoles("student"),
  issueUpload.array("attachments", 2),
  updateIssue
);

router.delete(
  "/:id",
  protect,
  requireObjectId("id"),
  authorizeRoles("admin"),
  deleteIssue
);


router.get("/", protect, authorizeRoles("admin"), getAllIssues);

router.get("/:id", protect, requireObjectId("id"), getIssueById);

export default router;