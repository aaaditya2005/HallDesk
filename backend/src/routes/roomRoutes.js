import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { requireObjectId } from "../middleware/validation.js";
import {
  createRoom,
  getAllRooms,
  getWardenRooms,
  assignStudentToRoom,
  previewRoomLottery,
  getRoomById,
  generateRooms,
  updateRoom,
  deleteRoom,
} from "../controllers/roomController.js";


const router = express.Router();

router.post("/", protect, authorizeRoles("admin"), createRoom);
router.post("/generate", protect, authorizeRoles("admin"), generateRooms);
router.patch("/:id", protect, requireObjectId("id"), authorizeRoles("admin"), updateRoom);
router.delete("/:id", protect, requireObjectId("id"), authorizeRoles("admin"), deleteRoom);
router.get("/", protect, authorizeRoles("admin"), getAllRooms);
router.patch("/warden/:roomId/assign", protect, requireObjectId("roomId"), authorizeRoles("warden"), assignStudentToRoom);
router.post("/warden/lottery/preview", protect, authorizeRoles("warden"), previewRoomLottery);
router.get("/warden", protect, authorizeRoles("warden"), getWardenRooms);

router.get("/:id", protect, requireObjectId("id"), getRoomById);

export default router;