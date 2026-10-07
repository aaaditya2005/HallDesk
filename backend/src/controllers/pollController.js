import prisma from "../config/prisma.js";
import { emitHallEvent } from "../socket.js";

const getHallId = (hallId) => {
  if (!hallId) return null;
  return hallId.id || hallId._id ? hallId.id || hallId._id : hallId;
};

const parseYMD = (dateInput) => {
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return [dateInput.getFullYear(), dateInput.getMonth() + 1, dateInput.getDate()];
  }
  if (typeof dateInput !== "string") return null;

  const exactMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (exactMatch) {
    return [Number(exactMatch[1]), Number(exactMatch[2]), Number(exactMatch[3])];
  }
  return null;
};

const parseDateToStartOfDay = (dateInput) => {
  const parts = parseYMD(dateInput);
  if (!parts) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const parseDateToEndOfDay = (dateInput) => {
  const parts = parseYMD(dateInput);
  if (!parts) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day, 23, 59, 59, 999);
};

const computeStatus = (poll) => {
  const now = new Date();
  if (poll.startDate && new Date(poll.startDate) > now) {
    return "Upcoming";
  }
  if (poll.endDate && new Date(poll.endDate) < now) {
    return "Closed";
  }
  return "Active";
};

const formatPoll = (poll, currentVote) => {
  if (!poll) return null;
  const status = computeStatus(poll);
  const options = (poll.options || []).map((o, idx) => ({
    _id: o.id,
    optionText: o.optionText,
    voteCount: o.voteCount,
  }));

  return {
    ...poll,
    _id: poll.id,
    status,
    hasVoted: Boolean(currentVote),
    selectedOption: currentVote?.selectedOption || null,
    selectedIndex: typeof currentVote?.selectedIndex === "number" ? currentVote.selectedIndex : null,
    totalVotes: poll.totalVotes || 0,
    options,
    createdBy: poll.createdBy ? { ...poll.createdBy, _id: poll.createdBy.id } : poll.createdById,
    hallId: poll.hall ? { ...poll.hall, _id: poll.hall.id } : poll.hallId,
  };
};

export const getPolls = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const hallId = req.user.role === "admin"
      ? getHallId(req.query.hallId || req.user.hallId)
      : getHallId(req.user.hallId);

    const where = {};
    if (hallId) where.hallId = hallId;

    const polls = await prisma.poll.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        options: { orderBy: { id: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    const pollIds = polls.map((p) => p.id);
    const votes = req.user.role === "student"
      ? await prisma.vote.findMany({ where: { pollId: { in: pollIds }, studentId: userId } })
      : [];

    const voteMap = new Map(votes.map((v) => [v.pollId, v]));

    const normalized = polls.map((poll) => formatPoll(poll, voteMap.get(poll.id)));

    const statusFilter = req.query.status;
    const filtered = statusFilter && statusFilter !== "All"
      ? normalized.filter((poll) => poll.status === statusFilter)
      : normalized;

    res.status(200).json({
      success: true,
      polls: filtered,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getPollById = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const poll = await prisma.poll.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        options: { orderBy: { id: "asc" } },
      },
    });

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: "Poll not found",
      });
    }

    const currentVote = req.user.role === "student"
      ? await prisma.vote.findUnique({
          where: { pollId_studentId: { pollId: poll.id, studentId: userId } },
        })
      : null;

    res.status(200).json({
      success: true,
      poll: formatPoll(poll, currentVote),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const createPollNumber = async (hallId) => {
  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const count = await prisma.poll.count({
    where: { hallId, createdAt: { gte: startOfDay, lt: endOfDay } },
  });
  return `POLL-${datePart}-${String(count + 1).padStart(3, "0")}`;
};

export const createPoll = async (req, res) => {
  try {
    const { title, description, options, startDate, endDate } = req.body;
    const userId = req.user.id || req.user._id;

    if (!title || !description || !options) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and options are required.",
      });
    }

    const parsedOptions = Array.isArray(options) ? options : JSON.parse(options || "[]");
    const normalizedOptions = parsedOptions
      .map((option) => ({ optionText: String(option).trim(), voteCount: 0 }))
      .filter((option) => option.optionText);

    if (normalizedOptions.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least two poll options are required.",
      });
    }

    const pollHallId = req.user.role === "admin"
      ? getHallId(req.body.hallId || req.user.hallId)
      : getHallId(req.user.hallId);

    if (!pollHallId) {
      return res.status(400).json({
        success: false,
        message: "Hall association is required to create a poll.",
      });
    }

    const pollNumber = await createPollNumber(pollHallId);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let start;
    if (startDate) {
      const dateStartOfDay = parseDateToStartOfDay(startDate);
      const now = new Date();
      now.setSeconds(0);
      now.setMilliseconds(0);
      const isSameDay = dateStartOfDay.getTime() === todayStart.getTime();
      start = isSameDay ? now : dateStartOfDay;
    } else {
      start = new Date();
    }

    const end = endDate ? parseDateToEndOfDay(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid start and end dates.",
      });
    }

    if (start < todayStart) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be in the past.",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid date range with the end date after the start date.",
      });
    }

    const poll = await prisma.poll.create({
      data: {
        pollNumber,
        title: title.trim(),
        description: description.trim(),
        createdById: userId,
        hallId: pollHallId,
        startDate: start,
        endDate: end,
        status: computeStatus({ startDate: start, endDate: end }),
        totalVotes: 0,
        isActive: true,
        options: {
          create: normalizedOptions,
        },
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        options: { orderBy: { id: "asc" } },
      },
    });

    const formattedPoll = formatPoll(poll, null);

    try {
      emitHallEvent(poll.hallId, "poll-created", formattedPoll);
    } catch (err) {
      console.error("Failed to emit poll-created", err);
    }

    res.status(201).json({
      success: true,
      poll: formattedPoll,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const deletePoll = async (req, res) => {
  try {
    const poll = await prisma.poll.findUnique({ where: { id: req.params.id } });

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: "Poll not found.",
      });
    }

    if (req.user.role === "warden") {
      const userHallId = getHallId(req.user.hallId);
      if (String(userHallId) !== String(poll.hallId)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to delete this poll.",
        });
      }
    }

    await prisma.poll.delete({ where: { id: poll.id } });

    try {
      emitHallEvent(poll.hallId, "poll-deleted", { pollId: poll.id });
    } catch (err) {
      console.error("Failed to emit poll-deleted", err);
    }

    res.status(200).json({
      success: true,
      message: "Poll deleted successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const voteOnPoll = async (req, res) => {
  try {
    const { selectedOption, selectedIndex } = req.body;
    const userId = req.user.id || req.user._id;

    let selIndex = null;
    if (typeof selectedIndex === "number") selIndex = selectedIndex;

    const poll = await prisma.poll.findUnique({
      where: { id: req.params.id },
      include: { options: { orderBy: { id: "asc" } } },
    });

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: "Poll not found.",
      });
    }

    const status = computeStatus(poll);
    if (status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Voting is allowed only while the poll is active.",
      });
    }

    if (selIndex === null && selectedOption) {
      const asText = String(selectedOption).trim();
      selIndex = poll.options.findIndex((o) => o.optionText === asText);
    }

    if (selIndex === null || selIndex < 0 || selIndex >= poll.options.length) {
      return res.status(400).json({ success: false, message: "Selected option is not valid for this poll." });
    }

    const option = poll.options[selIndex];

    const existingVote = await prisma.vote.findUnique({
      where: { pollId_studentId: { pollId: poll.id, studentId: userId } },
    });

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: "You have already voted in this poll.",
      });
    }

    await prisma.vote.create({
      data: {
        pollId: poll.id,
        studentId: userId,
        selectedOption: option.optionText,
        selectedIndex: selIndex,
      },
    });

    await prisma.pollOption.update({
      where: { id: option.id },
      data: { voteCount: { increment: 1 } },
    });

    const updatedPoll = await prisma.poll.update({
      where: { id: poll.id },
      data: { totalVotes: { increment: 1 } },
      include: {
        createdBy: { select: { id: true, name: true } },
        hall: { select: { id: true, hallName: true, hallNumber: true } },
        options: { orderBy: { id: "asc" } },
      },
    });

    const formattedPoll = formatPoll(updatedPoll, {
      selectedOption: option.optionText,
      selectedIndex: selIndex,
    });

    try {
      const emitPayload = { ...formattedPoll, hasVoted: false, selectedOption: null, selectedIndex: null };
      emitHallEvent(poll.hallId, "poll-updated", emitPayload);
    } catch (err) {
      console.error("Failed to emit poll-updated", err);
    }

    res.status(200).json({
      success: true,
      poll: formattedPoll,
    });
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "You have already voted in this poll.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
