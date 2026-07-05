import express from "express";

import {
  createHall,
  getAllHalls,
  getHallById,
} from "../controllers/hallController.js";

const router = express.Router();

router.post("/", createHall);

router.get("/", getAllHalls);

router.get("/:id", getHallById);

export default router;