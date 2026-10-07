import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import {
  getDailyMenus,
  getDailyMenuById,
  createDailyMenu,
  updateDailyMenu,
  deleteDailyMenu,
  getMessExpenses,
  getMessExpenseById,
  createMessExpense,
  updateMessExpense,
  deleteMessExpense,
  deleteExpenseAttachment,
} from "../controllers/messController.js";
import upload, { messExpenseUpload } from "../config/multer.js";
import { requireObjectId } from "../middleware/validation.js";

const router = express.Router();

// ========== DAILY MENU ROUTES ==========
// Get all menus (students, wardens, mess managers, admins - all can view their hall)
router.get("/menus", protect, getDailyMenus);

// Get single menu by ID
router.get("/menus/:id", protect, requireObjectId("id"), getDailyMenuById);

// Create menu (only mess manager and admin)
router.post(
  "/menus",
  protect,
  authorizeRoles("mess_manager", "admin"),
  createDailyMenu
);

// Update menu (only creator or admin)
router.put(
  "/menus/:id",
  protect,
  requireObjectId("id"),
  authorizeRoles("mess_manager", "admin"),
  updateDailyMenu
);

// Delete menu (only creator or admin)
router.delete(
  "/menus/:id",
  protect,
  requireObjectId("id"),
  authorizeRoles("mess_manager", "admin"),
  deleteDailyMenu
);

// ========== MESS EXPENSE ROUTES ==========
// Get all expenses (students, wardens, mess managers, admins - all can view their hall)
router.get("/expenses", protect, getMessExpenses);

// Get single expense by ID
router.get("/expenses/:id", protect, requireObjectId("id"), getMessExpenseById);

// Create expense with file upload (only mess manager and admin)
router.post(
  "/expenses",
  protect,
  authorizeRoles("mess_manager", "admin"),
  messExpenseUpload.array("attachments", 5),
  createMessExpense
);

// Update expense (only creator or admin)
router.put(
  "/expenses/:id",
  protect,
  requireObjectId("id"),
  authorizeRoles("mess_manager", "admin"),
  messExpenseUpload.array("attachments", 5),
  updateMessExpense
);

// Delete expense (only creator or admin)
router.delete(
  "/expenses/:id",
  protect,
  requireObjectId("id"),
  authorizeRoles("mess_manager", "admin"),
  deleteMessExpense
);

// Delete specific attachment from expense
router.delete(
  "/expenses/:id/attachment",
  protect,
  requireObjectId("id"),
  authorizeRoles("mess_manager", "admin"),
  deleteExpenseAttachment
);

export default router;
