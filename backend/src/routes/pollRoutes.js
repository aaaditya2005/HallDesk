import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { requireObjectId } from "../middleware/validation.js";
import {
  getPolls,
  getPollById,
  voteOnPoll,
  createPoll,
  deletePoll,
} from "../controllers/pollController.js";

const router = express.Router();

router.get("/", protect, getPolls);
router.get("/:id", protect, requireObjectId("id"), getPollById);
router.post("/", protect, authorizeRoles("admin", "warden"), createPoll);
router.post(
  "/:id/vote",
  protect,
  requireObjectId("id"),
  authorizeRoles("student"),
  voteOnPoll
);
router.delete("/:id", protect, requireObjectId("id"), authorizeRoles("admin", "warden"), deletePoll);

export default router;
