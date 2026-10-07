import express from "express";

import protect from "../middleware/authMiddleware.js";

import { getAdminDashboard, getStudentDashboard } from "../controllers/dashboardController.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get(
    "/admin",
    protect,
    authorizeRoles("admin"),
    getAdminDashboard
);

router.get(
    "/student",
    protect,
    getStudentDashboard
);

export default router;