import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

export const registerUser = async (req, res) => {
  try {
    const {
      name,
      username,
      password,
      role,

      hallId,
      roomId,

      registrationNo,
      rollNo,

      department,
      course,
      currentYear,

      phone,
      parentPhone,
      gender,

      designation,
      officePhone,

      companyName,
      managerId,

      adminLevel,
    } = req.body;

    const existingUser = await User.findOne({
      username,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    const user = await User.create({
        name,
        username,
        password,
        role,

        hallId,
        roomId,

        registrationNo,
        rollNo,

        department,
        course,
        currentYear,

        phone,
        parentPhone,
        gender,

        designation,
        officePhone,

        companyName,
        managerId,

        adminLevel,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",

      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,

        registrationNo: user.registrationNo,
        rollNo: user.rollNo,

        department: user.department,
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

    // Check if user exists
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // Compare password
    // Compare password
    const isMatch =
        await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,

      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        hallId: user.hallId,
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
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

