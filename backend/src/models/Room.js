import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    hallId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hall",
    required: true,
    },
    block: {
    type: String,
    required: true,
    trim: true,
    },
    floor: {
    type: Number,
    required: true,
    min: 0,
    },
    roomNumber: {
    type: String,
    required: true,
    trim: true,
    },
    capacity: {
    type: Number,
    required: true,
    min: 1,
    },
    occupants: [
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    ],
    status: {
    type: String,
    enum: [
        "Available",
        "Partially Occupied",
        "Full",
        "Under Maintenance",
    ],
    default: "Available",
    },
    isActive: {
    type: Boolean,
    default: true,
    },

  },
  {
    timestamps: true,
  }
);

roomSchema.index(
  {
    hallId: 1,
    block: 1,
    roomNumber: 1,
  },
  {
    unique: true,
  }
);

const Room = mongoose.model("Room", roomSchema);

export default Room;