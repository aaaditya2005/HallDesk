import mongoose from "mongoose";

const hallSchema = new mongoose.Schema(
  {
    hallNumber: {
    type: Number,
    required: true,
    unique: true,
    },

    hallName: {
    type: String,
    required: true,
    trim: true,
    },

    gender: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },

    totalFloors: {
    type: Number,
    required: true,
    min: 1,
    },

  blocks: [
    {
      type: String,
      trim: true,
    },
  ],

    capacity: {
    type: Number,
    required: true,
    min: 1,
    },

    occupiedRooms: {
      type: Number,
      default: 0,
    },

    availableRooms: {
      type: Number,
      default: 0,
    },

    description: {
      type: String,
      default: "",
    },

    wardenIds: [
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    ],
    messManagerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
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

const Hall = mongoose.model("Hall", hallSchema);

export default Hall;