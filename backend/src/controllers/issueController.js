import prisma from "../config/prisma.js";
import { emitHallEvent } from "../socket.js";
import cloudinary from "../config/cloudinary.js";

const writeIssueAudit = (req, action, issue, details = {}) =>
  prisma.auditLog.create({
    data: {
      actorId: req.user.id || req.user._id,
      action,
      entity: "Issue",
      entityId: issue?.id || issue?._id || null,
      details: {
        issueNumber: issue?.issueNumber,
        title: issue?.title,
        hallId: issue?.hallId,
        reportedBy: issue?.reportedById || issue?.reportedBy,
        ...details,
      },
    },
  });

const normalizeId = (value) => String(value?.id || value?._id || value || "");

const canViewIssue = (req, issue) => {
  const userId = req.user.id || req.user._id;
  const userHallId = req.user.hallId?.id || req.user.hallId;

  if (req.user.role === "admin") return true;
  if (req.user.role === "student") return normalizeId(issue.reportedById || issue.reportedBy) === normalizeId(userId);
  if (req.user.role === "warden") return normalizeId(issue.hallId) === normalizeId(userHallId);
  return false;
};

const formatIssue = (issue) => {
  if (!issue) return null;
  return {
    ...issue,
    _id: issue.id,
    reportedBy: issue.reportedBy ? { ...issue.reportedBy, _id: issue.reportedBy.id } : issue.reportedById,
    hallId: issue.hall ? { ...issue.hall, _id: issue.hall.id } : issue.hallId,
    roomId: issue.room ? { ...issue.room, _id: issue.room.id } : issue.roomId,
    assignedTo: issue.assignedTo ? { ...issue.assignedTo, _id: issue.assignedTo.id } : issue.assignedToId,
    resolvedBy: issue.resolvedBy ? { ...issue.resolvedBy, _id: issue.resolvedBy.id } : issue.resolvedById,
    timeline: issue.timeline ? issue.timeline.map((t) => ({ ...t, _id: t.id, by: t.by ? { ...t.by, _id: t.by.id } : t.byId })) : [],
  };
};

export const createIssue = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const userId = req.user.id || req.user._id;
    const userHallId = req.user.hallId?.id || req.user.hallId;
    const userRoomId = req.user.roomId?.id || req.user.roomId;

    const today = new Date();
    const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const todayCount = await prisma.issue.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const issueNumber = `ISSUE-${datePart}-${String(todayCount + 1).padStart(3, "0")}`;

    const attachments = [];
    const attachmentPublicIds = [];
    const attachmentOriginalNames = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (file.size > 10 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            message: "Each attachment must be <= 10MB",
          });
        }
        const fileData = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        const result = await cloudinary.uploader.upload(fileData, {
          folder: "halldesk/issues",
          resource_type: "image",
        });
        attachments.push(result.secure_url);
        attachmentPublicIds.push(result.public_id);
        attachmentOriginalNames.push(file.originalname || "");
      }
    }

    const issue = await prisma.issue.create({
      data: {
        issueNumber,
        title,
        description,
        category,
        attachments,
        attachmentPublicId: attachmentPublicIds,
        attachmentOriginalName: attachmentOriginalNames,
        reportedById: userId,
        hallId: userHallId,
        roomId: userRoomId,
        status: "Pending",
        timeline: {
          create: [
            {
              action: "Created",
              remark: "Issue reported",
              byId: userId,
            },
          ],
        },
      },
      include: {
        reportedBy: { select: { id: true, name: true, registrationNo: true, branch: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        room: { select: { id: true, roomNumber: true, floor: true, block: true } },
        assignedTo: { select: { id: true, name: true } },
        timeline: { include: { by: { select: { id: true, name: true, role: true } } } },
      },
    });

    const formattedIssue = formatIssue(issue);

    if (formattedIssue?.hallId) {
      emitHallEvent(issue.hallId, "issue-created", formattedIssue);
    }
    await writeIssueAudit(req, "created", issue, { status: issue.status, category: issue.category });

    res.status(201).json({
      success: true,
      issue: formattedIssue,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getAllIssues = async (req, res) => {
  try {
    const issues = await prisma.issue.findMany({
      include: {
        reportedBy: { select: { id: true, name: true, registrationNo: true, branch: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        room: { select: { id: true, roomNumber: true, floor: true, block: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedIssues = issues.map(formatIssue);

    res.status(200).json({
      success: true,
      count: formattedIssues.length,
      issues: formattedIssues,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getMyIssues = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const issues = await prisma.issue.findMany({
      where: { reportedById: userId },
      include: {
        room: { select: { id: true, roomNumber: true, floor: true, block: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedIssues = issues.map(formatIssue);

    res.status(200).json({
      success: true,
      count: formattedIssues.length,
      issues: formattedIssues,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getIssueById = async (req, res) => {
  try {
    const issue = await prisma.issue.findUnique({
      where: { id: req.params.id },
      include: {
        reportedBy: { select: { id: true, name: true, registrationNo: true, branch: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        room: { select: { id: true, roomNumber: true, floor: true, block: true } },
        assignedTo: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
        timeline: { include: { by: { select: { id: true, name: true, role: true } } } },
      },
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    if (!canViewIssue(req, issue)) {
      return res.status(403).json({ success: false, message: "You are not allowed to view this issue." });
    }

    res.status(200).json({
      success: true,
      issue: formatIssue(issue),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateIssueStatus = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const userHallId = req.user.hallId?.id || req.user.hallId;

    const issue = await prisma.issue.findUnique({ where: { id: req.params.id } });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    const { status, remark } = req.body;

    if (!["Pending", "Accepted", "In Progress", "Resolved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid issue status." });
    }

    if (req.user.role === "warden" && normalizeId(issue.hallId) !== normalizeId(userHallId)) {
      return res.status(403).json({ success: false, message: "You can only manage issues from your hall." });
    }

    if (status === "Rejected" && !remark?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection remark is required when rejecting an issue.",
      });
    }

    const updateData = {
      status,
      lastUpdatedAt: new Date(),
      timeline: {
        create: [
          {
            action: status,
            remark: remark || `Issue marked as ${status}`,
            byId: userId,
          },
        ],
      },
    };

    if (["Accepted", "In Progress"].includes(status) && ["warden", "admin"].includes(req.user.role)) {
      updateData.assignedToId = userId;
    }

    if (status === "Rejected") {
      updateData.rejectionReason = remark;
    }

    if (status === "Resolved") {
      updateData.resolvedAt = new Date();
      updateData.resolvedById = userId;
    }

    const updatedIssue = await prisma.issue.update({
      where: { id: issue.id },
      data: updateData,
      include: {
        reportedBy: { select: { id: true, name: true, registrationNo: true, branch: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        room: { select: { id: true, roomNumber: true, floor: true, block: true } },
        assignedTo: { select: { id: true, name: true, username: true, role: true } },
        timeline: { include: { by: { select: { id: true, name: true, role: true } } } },
      },
    });

    const formattedIssue = formatIssue(updatedIssue);

    if (formattedIssue?.hallId) {
      emitHallEvent(updatedIssue.hallId, "issue-updated", formattedIssue);
    }
    await writeIssueAudit(req, "status_changed", updatedIssue, {
      status,
      remark: remark || null,
      assignedTo: updatedIssue.assignedToId || null,
    });

    res.status(200).json({
      success: true,
      issue: formattedIssue,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateIssue = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const issue = await prisma.issue.findUnique({ where: { id: req.params.id } });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    if (String(issue.reportedById) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (issue.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending issues can be edited.",
      });
    }

    const { title, description, category } = req.body;

    const updateData = {
      title,
      description,
      category,
      lastUpdatedAt: new Date(),
      timeline: {
        create: [
          {
            action: "Edited",
            remark: "Issue updated by student",
            byId: userId,
          },
        ],
      },
    };

    if (req.files && req.files.length > 0) {
      if (Array.isArray(issue.attachmentPublicId) && issue.attachmentPublicId.length) {
        for (const publicId of issue.attachmentPublicId) {
          try {
            await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
          } catch (err) {
            console.error("Failed to delete old issue cloudinary file:", err);
          }
        }
      }

      const uploadedAttachments = [];
      const newPublicIds = [];
      const newOriginalNames = [];
      for (const file of req.files) {
        if (file.size > 10 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            message: "Each attachment must be <= 10MB",
          });
        }
        const fileData = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        const result = await cloudinary.uploader.upload(fileData, {
          folder: "halldesk/issues",
          resource_type: "image",
        });
        uploadedAttachments.push(result.secure_url);
        newPublicIds.push(result.public_id);
        newOriginalNames.push(file.originalname || "");
      }
      updateData.attachments = uploadedAttachments;
      updateData.attachmentPublicId = newPublicIds;
      updateData.attachmentOriginalName = newOriginalNames;
    }

    const updatedIssue = await prisma.issue.update({
      where: { id: issue.id },
      data: updateData,
      include: {
        reportedBy: { select: { id: true, name: true, registrationNo: true, branch: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        room: { select: { id: true, roomNumber: true, floor: true, block: true } },
      },
    });

    const formattedIssue = formatIssue(updatedIssue);

    if (formattedIssue?.hallId) {
      emitHallEvent(updatedIssue.hallId, "issue-updated", formattedIssue);
    }
    await writeIssueAudit(req, "updated", updatedIssue, { status: updatedIssue.status, category: updatedIssue.category });

    res.status(200).json({
      success: true,
      issue: formattedIssue,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const deleteIssue = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const issue = await prisma.issue.findUnique({ where: { id: req.params.id } });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete issues.",
      });
    }

    const publicIds = Array.isArray(issue.attachmentPublicId) ? issue.attachmentPublicId.filter(Boolean) : [];
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    if (publicIds.length) {
      for (const publicId of publicIds) {
        try {
          await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
        } catch (err) {
          console.error(`deleteIssue: failed destroy for ${publicId}:`, err);
        }
      }
    }

    await prisma.issue.delete({ where: { id: issue.id } });
    await writeIssueAudit(req, "deleted", issue, { deletionReason: reason || null, previousStatus: issue.status });

    if (issue.hallId) {
      emitHallEvent(issue.hallId, "issue-deleted", { issueId: req.params.id });
    }

    res.status(200).json({
      success: true,
      message: "Issue deleted successfully.",
    });
  } catch (error) {
    console.error("deleteIssue error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const getIssuesForWarden = async (req, res) => {
  try {
    const wardenHallId = req.user.hallId?.id || req.user.hallId;
    if (!wardenHallId) {
      return res.status(400).json({ success: false, message: "Warden is not assigned to a hall." });
    }

    const currentStudents = await prisma.user.findMany({
      where: { hallId: wardenHallId, role: "student" },
      select: { id: true },
    });
    const historicalStudents = await prisma.residenceHistory.findMany({
      where: { hallId: wardenHallId },
      select: { studentId: true },
    });
    const visibleStudentIds = [...new Set([...currentStudents.map((s) => s.id), ...historicalStudents.map((h) => h.studentId)])];

    const issues = await prisma.issue.findMany({
      where: {
        OR: [{ hallId: wardenHallId }, { reportedById: { in: visibleStudentIds } }],
      },
      include: {
        reportedBy: { select: { id: true, name: true, registrationNo: true, branch: true } },
        room: { select: { id: true, roomNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedIssues = issues.map(formatIssue);

    res.status(200).json({
      success: true,
      count: formattedIssues.length,
      issues: formattedIssues,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
