import express from "express";
import rateLimit from "express-rate-limit";
import { body } from "express-validator";
import protect from "../middleware/authMiddleware.js";
import { rejectInvalidRequest } from "../middleware/validation.js";
import {
  loginUser,
  registerUser,
  getMe,
} from "../controllers/authController.js";

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: { success: false, message: "Too many authentication attempts. Try again later." } });
const credentials = [
  body("username").trim().isLength({ min: 3, max: 80 }).withMessage("Username must be 3 to 80 characters."),
  body("password").isString().notEmpty().withMessage("Password is required.").bail().isLength({ max: 128 }).withMessage("Password must be at most 128 characters."),
];

router.post("/register", authLimiter, [
  ...credentials,
  body("name").trim().isLength({ min: 2, max: 120 }).withMessage("Name is required."),
  body("role").equals("student").withMessage("Public registration is limited to students."),
  body("currentYear").optional({ values: "null" }).isInt({ min: 1, max: 10 }).withMessage("Current year must be between 1 and 10."),
  body("email").optional({ values: "null" }).isEmail().normalizeEmail().withMessage("Email must be valid."),
], rejectInvalidRequest, registerUser);
router.post("/login", authLimiter, credentials, rejectInvalidRequest, loginUser);
router.get("/me", protect, getMe);

export default router;

