import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

import {
  createIssue,
  getAllIssues,
  getMyIssues,
  getIssueById,
  updateIssueStatus,
  getIssuesForWarden,
} from "../controllers/issueController.js";

const router = express.Router();

router.post("/",
  protect,
  authorizeRoles("student"),
  createIssue
);

router.patch("/:id/status",
  protect,
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



router.get("/", getAllIssues);

router.get("/:id", getIssueById);

export default router;