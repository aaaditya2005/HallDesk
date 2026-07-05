import Issue from "../models/Issue.js";

export const createIssue = async (req, res) => {
  try {

    const {
      title,
      description,
      category,
      attachments,
    } = req.body;

    const today = new Date();

const datePart =
  `${today.getFullYear()}${String(
    today.getMonth() + 1
  ).padStart(2, "0")}${String(
    today.getDate()
  ).padStart(2, "0")}`;

const startOfDay = new Date(
  today.getFullYear(),
  today.getMonth(),
  today.getDate()
);

const endOfDay = new Date(
  today.getFullYear(),
  today.getMonth(),
  today.getDate() + 1
);

const todayCount =
  await Issue.countDocuments({
    createdAt: {
      $gte: startOfDay,
      $lt: endOfDay,
    },
  });

const issueNumber =
  `ISSUE-${datePart}-${String(
    todayCount + 1
  ).padStart(3, "0")}`;

    const issue = await Issue.create({
      issueNumber,

      title,
      description,
      category,

      attachments:
        attachments || [],

      reportedBy:
        req.user._id,

      hallId:
        req.user.hallId,

      roomId:
        req.user.roomId,

      status: "Pending",

      priority: "Medium",

      timeline: [
        {
          action: "Created",
          remark: "Issue reported",
          by: req.user._id,
        },
      ],
    });

    res.status(201).json({
      success: true,
      issue,
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
    const issues = await Issue.find()
      .populate("reportedBy", "name rollNo registrationNo")
      .populate("hallId", "hallName hallNumber")
      .populate("roomId", "roomNumber floor block")
      .populate("assignedTo", "name");

    res.status(200).json({
      success: true,
      count: issues.length,
      issues,
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
    const issues = await Issue.find({
      reportedBy: req.user._id,
    })
      .populate(
        "roomId",
        "roomNumber floor block"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: issues.length,
      issues,
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
    const issue = await Issue.findById(req.params.id)
      .populate("reportedBy", "name rollNo registrationNo")
      .populate("hallId", "hallName hallNumber")
      .populate("roomId", "roomNumber floor block")
      .populate("assignedTo", "name");

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    res.status(200).json({
      success: true,
      issue,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateIssueStatus = async (
  req,
  res
) => {
  try {

    const issue = await Issue.findById(
      req.params.id
    );

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    const { status, remark } = req.body;

    issue.status = status;

    issue.timeline.push({
      action: status,
      remark:
        remark || `Issue marked as ${status}`,
      by: req.user._id,
    });

    if (status === "Rejected") {
      issue.rejectionReason = remark;
    }

    if (status === "Resolved") {
      issue.resolvedAt = new Date();
      issue.resolvedBy = req.user._id;
    }

    issue.lastUpdatedAt = new Date();

    await issue.save();

    res.status(200).json({
      success: true,
      issue,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getIssuesForWarden = async (req, res) => {
    try {

      const issues =
        await Issue.find({
          hallId: req.user.hallId,
        })
          .populate(
            "reportedBy",
            "name rollNo"
          )
          .populate(
            "roomId",
            "roomNumber"
          )
          .sort({
            createdAt: -1,
          });

      res.status(200).json({
        success: true,
        count: issues.length,
        issues,
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: "Server Error",
      });
    }
  };


