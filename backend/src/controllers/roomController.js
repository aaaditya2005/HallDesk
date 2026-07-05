import Room from "../models/Room.js";

export const createRoom = async (req, res) => {
  try {
    const room = await Room.create(req.body);

    res.status(201).json({
      success: true,
      room,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate("hallId", "hallName hallNumber")
      .populate("occupants", "name rollNo registrationNo");

    res.status(200).json({
      success: true,
      count: rooms.length,
      rooms,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate("hallId", "hallName hallNumber")
      .populate("occupants", "name rollNo registrationNo");

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    res.status(200).json({
      success: true,
      room,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const generateRooms = async (req, res) => {
  try {
    const {
      hallId,
      block,
      totalFloors,
      roomsPerFloor,
      roomCapacity,
    } = req.body;

    const rooms = [];

    for (let floor = 1; floor <= totalFloors; floor++) {
      for (let room = 1; room <= roomsPerFloor; room++) {

        const roomNumber =
          `${floor}${String(room).padStart(2, "0")}`;

        rooms.push({
          hallId,
          block,
          floor,
          roomNumber,
          capacity: roomCapacity,
          occupants: [],
          status: "Available",
          isActive: true,
        });
      }
    }

    const createdRooms =
      await Room.insertMany(rooms);

    res.status(201).json({
      success: true,
      count: createdRooms.length,
      message: "Rooms generated successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};