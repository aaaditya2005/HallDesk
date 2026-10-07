import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { getAdminAuditLogs } from "../controllers/auditController.js";

const router = express.Router();
router.get("/admin", protect, authorizeRoles("admin"), getAdminAuditLogs);
export default router;