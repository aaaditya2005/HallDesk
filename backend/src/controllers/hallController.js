import Hall from "../models/Hall.js";

export const createHall = async (req, res) => {
  try {
    const hall = await Hall.create(req.body);

    res.status(201).json({
      success: true,
      hall,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getAllHalls = async (req, res) => {
  try {
    const halls = await Hall.find();

    res.status(200).json({
      success: true,
      count: halls.length,
      halls,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getHallById = async (req, res) => {
  try {
    const hall = await Hall.findById(req.params.id);

    if (!hall) {
      return res.status(404).json({
        success: false,
        message: "Hall not found",
      });
    }

    res.status(200).json({
      success: true,
      hall,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};