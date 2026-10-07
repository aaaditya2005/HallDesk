import prisma from "../config/prisma.js";
import { emitHallEvent } from "../socket.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import path from "path";

const expireDueNotices = async () => {
  const now = new Date();
  await prisma.notice.updateMany({
    where: { status: "Active", expiresAt: { lte: now } },
    data: { status: "Expired" },
  });
};

const toEndOfDay = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999`);
  return isNaN(date.getTime()) ? null : date;
};

const formatNotice = (notice) => {
  if (!notice) return null;
  const attachmentUrl = notice.attachmentUrl && notice.attachmentUrl.length > 0
    ? notice.attachmentUrl
    : (notice.attachmentPublicId || []).map((p) => cloudinary.url(p, { secure: true, resource_type: "raw" }));

  return {
    ...notice,
    _id: notice.id,
    attachmentUrl,
    createdBy: notice.createdBy ? { ...notice.createdBy, _id: notice.createdBy.id } : notice.createdById,
    hallId: notice.hall ? { ...notice.hall, _id: notice.hall.id } : notice.hallId,
  };
};

export const createNotice = async (req, res) => {
  try {
    const { title, description, expiresAt } = req.body;
    const userId = req.user.id || req.user._id;
    const userHallId = req.user.hallId?.id || req.user.hallId;

    const today = new Date();
    const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const todayCount = await prisma.notice.count({
      where: {
        hallId: userHallId,
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
    });

    const noticeNumber = `NOTICE-${datePart}-${String(todayCount + 1).padStart(3, "0")}`;
    const expiresAtDate = toEndOfDay(expiresAt);

    const attachments = [];
    const attachmentUrls = [];
    const attachmentPublicIds = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (file.size > 2 * 1024 * 1024) {
          return res.status(400).json({ success: false, message: "Each attachment must be <= 2MB" });
        }

        attachments.push(file.originalname);
        const fileData = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        const result = await cloudinary.uploader.upload(fileData, {
          folder: "halldesk/notices",
          resource_type: "raw",
        });
        attachmentUrls.push(result.secure_url);
        attachmentPublicIds.push(result.public_id);
      }
    }

    const notice = await prisma.notice.create({
      data: {
        noticeNumber,
        title,
        description,
        attachment: attachments,
        attachmentUrl: attachmentUrls,
        attachmentPublicId: attachmentPublicIds,
        createdById: userId,
        hallId: userHallId,
        expiresAt: expiresAtDate,
        status: "Active",
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    const formattedNotice = formatNotice(notice);
    if (notice.hallId) {
      emitHallEvent(notice.hallId, "notice-created", formattedNotice);
    }

    res.status(201).json({
      success: true,
      notice: formattedNotice,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getNotices = async (req, res) => {
  try {
    await expireDueNotices();
    const { status, startDate, endDate } = req.query;
    const userHallId = req.user.hallId?.id || req.user.hallId;

    const where = { hallId: userHallId };

    if (status && status !== "All") {
      where.status = status;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const notices = await prisma.notice.findMany({
      where,
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const formattedNotices = notices.map(formatNotice);

    res.status(200).json({
      success: true,
      notices: formattedNotices,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getNotice = async (req, res) => {
  try {
    await expireDueNotices();
    const notice = await prisma.notice.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    res.status(200).json({
      success: true,
      notice: formatNotice(notice),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateNotice = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const notice = await prisma.notice.findUnique({ where: { id: req.params.id } });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    const isOwner = String(notice.createdById) === String(userId);
    const isAdmin = req.user.role === "admin";
    const minutesSinceCreate = (Date.now() - new Date(notice.createdAt).getTime()) / 1000 / 60;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this notice",
      });
    }

    if (!isAdmin && minutesSinceCreate > 20) {
      return res.status(403).json({
        success: false,
        message: "Editing is only allowed within 20 minutes of notice creation",
      });
    }

    if (notice.status !== "Active" && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only active notices can be edited",
      });
    }

    const { title, description, expiresAt } = req.body;

    const updateData = {
      title,
      description,
      expiresAt: toEndOfDay(expiresAt),
    };

    if (req.files && req.files.length > 0) {
      if (Array.isArray(notice.attachmentPublicId) && notice.attachmentPublicId.length) {
        for (const publicId of notice.attachmentPublicId) {
          try {
            await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
          } catch (err) {
            console.error("Failed to delete old Cloudinary notice file:", err);
          }
        }
      }

      const newAttachments = [];
      const newAttachmentUrls = [];
      const newAttachmentPublicIds = [];

      for (const file of req.files) {
        if (file.size > 2 * 1024 * 1024) {
          return res.status(400).json({ success: false, message: "Each attachment must be <= 2MB" });
        }

        newAttachments.push(file.originalname);
        const fileData = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        const result = await cloudinary.uploader.upload(fileData, {
          folder: "halldesk/notices",
          resource_type: "raw",
        });
        newAttachmentUrls.push(result.secure_url);
        newAttachmentPublicIds.push(result.public_id);
      }

      updateData.attachment = newAttachments;
      updateData.attachmentUrl = newAttachmentUrls;
      updateData.attachmentPublicId = newAttachmentPublicIds;
    }

    const updatedNotice = await prisma.notice.update({
      where: { id: notice.id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    const formattedNotice = formatNotice(updatedNotice);
    if (updatedNotice.hallId) {
      emitHallEvent(updatedNotice.hallId, "notice-updated", formattedNotice);
    }

    res.status(200).json({
      success: true,
      notice: formattedNotice,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const expireNotice = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const notice = await prisma.notice.findUnique({ where: { id: req.params.id } });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    const isOwner = String(notice.createdById) === String(userId);
    const isAdmin = req.user.role === "admin";

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to expire this notice",
      });
    }

    if (notice.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Only active notices can be expired",
      });
    }

    const updatedNotice = await prisma.notice.update({
      where: { id: notice.id },
      data: {
        status: "Expired",
        expiresAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
      },
    });

    const formattedNotice = formatNotice(updatedNotice);
    if (updatedNotice.hallId) {
      emitHallEvent(updatedNotice.hallId, "notice-updated", formattedNotice);
    }

    res.status(200).json({
      success: true,
      notice: formattedNotice,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const deleteNotice = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const notice = await prisma.notice.findUnique({ where: { id: req.params.id } });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    const isOwner = String(notice.createdById) === String(userId);
    const isAdmin = req.user.role === "admin";

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this notice",
      });
    }

    const attachmentPublicIds = Array.isArray(notice.attachmentPublicId) ? notice.attachmentPublicId : [];
    const attachmentFilenames = Array.isArray(notice.attachment) ? notice.attachment : [];

    await prisma.notice.delete({ where: { id: req.params.id } });

    if (attachmentPublicIds.length) {
      for (const publicId of attachmentPublicIds) {
        try {
          await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
        } catch (err) {
          console.error("Failed to delete Cloudinary notice file:", err);
        }
      }
    }

    if (attachmentFilenames.length) {
      for (const filename of attachmentFilenames) {
        try {
          const filePath = path.join(process.cwd(), "uploads", "notices", filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error("Failed to remove attachment file:", err);
        }
      }
    }

    if (notice.hallId) {
      emitHallEvent(notice.hallId, "notice-deleted", { noticeId: req.params.id });
    }

    res.status(200).json({
      success: true,
      message: "Notice permanently deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
