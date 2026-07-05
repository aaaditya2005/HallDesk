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

    hostelType: {
    type: String,
    enum: ["Boys", "Girls"],
    required: true,
    },

    totalFloors: {
    type: Number,
    required: true,
    min: 1,
    },

    blocks: [
    {
        type: [String],
        trim: true,
    },
    ],

    capacity: {
    type: Number,
    required: true,
    min: 1,
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