import prisma from "../config/prisma.js";
import generateToken from "../utils/generateToken.js";
import { hashPassword, matchPassword } from "../utils/authUtils.js";

export const registerUser = async (req, res) => {
  try {
    const {
      name,
      username,
      password,
      role,
      registrationNo,
      department,
      branch,
      course,
      currentYear,
      phone,
      parentPhone,
      gender,
    } = req.body;

    if (role !== "student") {
      return res.status(403).json({ success: false, message: "Only student accounts can be registered publicly." });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        role: "student",
        registrationNo,
        department,
        branch,
        course,
        currentYear: currentYear ? Number(currentYear) : null,
        phone,
        parentPhone,
        gender,
      },
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        registrationNo: user.registrationNo,
        department: user.department,
        branch: user.branch,
        currentYear: user.currentYear,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "This account is inactive." });
    }

    const isMatch = await matchPassword(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        hallId: user.hallId,
        roomId: user.roomId,
        registrationNo: user.registrationNo,
        rollNo: user.rollNo,
        branch: user.branch,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        ...req.user,
        _id: req.user.id,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
