import prisma from "../config/prisma.js";
import cloudinary from "../config/cloudinary.js";

const getHallId = (hallId) => {
  if (!hallId) return null;
  return hallId.id || hallId._id ? hallId.id || hallId._id : hallId;
};

const formatMenu = (m) => (m ? { ...m, _id: m.id, createdBy: m.createdBy ? { ...m.createdBy, _id: m.createdBy.id } : m.createdById, hallId: m.hall ? { ...m.hall, _id: m.hall.id } : m.hallId } : null);
const formatExpense = (e) => (e ? { ...e, _id: e.id, createdBy: e.createdBy ? { ...e.createdBy, _id: e.createdBy.id } : e.createdById, hallId: e.hall ? { ...e.hall, _id: e.hall.id } : e.hallId } : null);

// ========== DAILY MENU CONTROLLER ==========
export const getDailyMenus = async (req, res) => {
  try {
    const hallId = req.user.role === "admin"
      ? getHallId(req.query.hallId || req.user.hallId)
      : getHallId(req.user.hallId);

    const where = {};
    if (hallId) where.hallId = hallId;

    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
      where.menuDate = { ...(where.menuDate || {}), gte: startDate };
    }
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
      where.menuDate = { ...(where.menuDate || {}), lte: endDate };
    }

    const menus = await prisma.dailyMenu.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
      orderBy: { menuDate: "desc" },
    });

    res.status(200).json({
      success: true,
      menus: menus.map(formatMenu),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getDailyMenuById = async (req, res) => {
  try {
    const menu = await prisma.dailyMenu.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    res.status(200).json({
      success: true,
      menu: formatMenu(menu),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const createDailyMenu = async (req, res) => {
  try {
    const { menuDate, breakfast, lunch, dinner } = req.body;
    const userId = req.user.id || req.user._id;

    if (!menuDate) {
      return res.status(400).json({
        success: false,
        message: "Menu date is required.",
      });
    }

    const hallId = req.user.role === "admin"
      ? getHallId(req.body.hallId || req.user.hallId)
      : getHallId(req.user.hallId);

    if (!hallId) {
      return res.status(400).json({
        success: false,
        message: "Hall association is required.",
      });
    }

    const parsedDate = new Date(menuDate);

    const existingMenu = await prisma.dailyMenu.findUnique({
      where: {
        hallId_menuDate: {
          hallId,
          menuDate: parsedDate,
        },
      },
    });

    if (existingMenu) {
      return res.status(400).json({
        success: false,
        message: "Menu already exists for this date.",
      });
    }

    const menu = await prisma.dailyMenu.create({
      data: {
        hallId,
        createdById: userId,
        menuDate: parsedDate,
        breakfast: Array.isArray(breakfast) ? breakfast : [],
        lunch: Array.isArray(lunch) ? lunch : [],
        dinner: Array.isArray(dinner) ? dinner : [],
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    res.status(201).json({
      success: true,
      menu: formatMenu(menu),
      message: "Menu created successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateDailyMenu = async (req, res) => {
  try {
    const { breakfast, lunch, dinner } = req.body;
    const userId = req.user.id || req.user._id;

    const menu = await prisma.dailyMenu.findUnique({ where: { id: req.params.id } });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    if (req.user.role !== "admin" && String(menu.createdById) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this menu.",
      });
    }

    const updateData = {};
    if (breakfast !== undefined) updateData.breakfast = Array.isArray(breakfast) ? breakfast : [];
    if (lunch !== undefined) updateData.lunch = Array.isArray(lunch) ? lunch : [];
    if (dinner !== undefined) updateData.dinner = Array.isArray(dinner) ? dinner : [];

    const updatedMenu = await prisma.dailyMenu.update({
      where: { id: menu.id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    res.status(200).json({
      success: true,
      menu: formatMenu(updatedMenu),
      message: "Menu updated successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const deleteDailyMenu = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const menu = await prisma.dailyMenu.findUnique({ where: { id: req.params.id } });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    if (req.user.role !== "admin" && String(menu.createdById) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this menu.",
      });
    }

    await prisma.dailyMenu.delete({ where: { id: req.params.id } });

    res.status(200).json({
      success: true,
      message: "Menu deleted successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ========== MESS EXPENSE CONTROLLER ==========
export const getMessExpenses = async (req, res) => {
  try {
    const hallId = req.user.role === "admin"
      ? getHallId(req.query.hallId || req.user.hallId)
      : getHallId(req.user.hallId);

    const where = {};
    if (hallId) where.hallId = hallId;

    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
      where.expenseDate = { ...(where.expenseDate || {}), gte: startDate };
    }
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
      where.expenseDate = { ...(where.expenseDate || {}), lte: endDate };
    }

    const expenses = await prisma.messExpense.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
      orderBy: { expenseDate: "desc" },
    });

    res.status(200).json({
      success: true,
      expenses: expenses.map(formatExpense),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getMessExpenseById = async (req, res) => {
  try {
    const expense = await prisma.messExpense.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    res.status(200).json({
      success: true,
      expense: formatExpense(expense),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const createMessExpense = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.user.id || req.user._id;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Expense title is required.",
      });
    }

    const hallId = req.user.role === "admin"
      ? getHallId(req.body.hallId || req.user.hallId)
      : getHallId(req.user.hallId);

    if (!hallId) {
      return res.status(400).json({
        success: false,
        message: "Hall association is required.",
      });
    }

    const uploadedAttachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (file.size > 2 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            message: "Each file must be 2 MB or smaller.",
          });
        }

        const fileData = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        const result = await cloudinary.uploader.upload(fileData, {
          folder: "halldesk/mess-expenses",
          resource_type: "auto",
        });

        uploadedAttachments.push(result.secure_url);
      }
    }

    const expense = await prisma.messExpense.create({
      data: {
        hallId,
        createdById: userId,
        expenseDate: new Date(),
        title: title.trim(),
        description: description?.trim() || null,
        amount: 0,
        category: "Other",
        attachments: uploadedAttachments,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    res.status(201).json({
      success: true,
      expense: formatExpense(expense),
      message: "Expense added successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateMessExpense = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.user.id || req.user._id;

    const expense = await prisma.messExpense.findUnique({ where: { id: req.params.id } });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (req.user.role !== "admin" && String(expense.createdById) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this expense.",
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;

    if (req.files && req.files.length > 0) {
      const newAttachments = [];

      for (const file of req.files) {
        if (file.size > 2 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            message: "Each file must be 2 MB or smaller.",
          });
        }

        const fileData = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        const result = await cloudinary.uploader.upload(fileData, {
          folder: "halldesk/mess-expenses",
          resource_type: "auto",
        });

        newAttachments.push(result.secure_url);
      }

      updateData.attachments = [...(expense.attachments || []), ...newAttachments];
    }

    const updatedExpense = await prisma.messExpense.update({
      where: { id: expense.id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    res.status(200).json({
      success: true,
      expense: formatExpense(updatedExpense),
      message: "Expense updated successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const deleteMessExpense = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const expense = await prisma.messExpense.findUnique({ where: { id: req.params.id } });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (req.user.role !== "admin" && String(expense.createdById) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this expense.",
      });
    }

    await prisma.messExpense.delete({ where: { id: req.params.id } });

    res.status(200).json({
      success: true,
      message: "Expense deleted successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const deleteExpenseAttachment = async (req, res) => {
  try {
    const { attachmentPath } = req.body;
    const userId = req.user.id || req.user._id;

    const expense = await prisma.messExpense.findUnique({ where: { id: req.params.id } });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (req.user.role !== "admin" && String(expense.createdById) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this expense.",
      });
    }

    const updatedAttachments = (expense.attachments || []).filter((att) => att !== attachmentPath);
    await prisma.messExpense.update({
      where: { id: expense.id },
      data: { attachments: updatedAttachments },
    });

    res.status(200).json({
      success: true,
      message: "Attachment removed successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
