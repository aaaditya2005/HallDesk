import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { requireObjectId } from "../middleware/validation.js";

import {
  createHall,
  getAllHalls,
  getHallById,
  updateHall,
  deleteHall,
} from "../controllers/hallController.js";

const router = express.Router();

router.post("/", protect, authorizeRoles("admin"), createHall);
router.patch("/:id", protect, requireObjectId("id"), authorizeRoles("admin"), updateHall);
router.delete("/:id", protect, requireObjectId("id"), authorizeRoles("admin"), deleteHall);

router.get("/", protect, getAllHalls);

router.get("/:id", protect, requireObjectId("id"), getHallById);

export default router;