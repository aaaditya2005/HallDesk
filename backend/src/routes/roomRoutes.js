import express from "express";
import {
  createRoom,
  getAllRooms,
  getRoomById,
  generateRooms,
} from "../controllers/roomController.js";


const router = express.Router();

router.post("/", createRoom);
router.post("/generate", generateRooms);
router.get("/", getAllRooms);

router.get("/:id", getRoomById);

export default router;