import mongoose from "mongoose";

const dailyMenuSchema = new mongoose.Schema(
  {
    hallId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hall",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    menuDate: {
      type: Date,
      required: true,
    },

    breakfast: [
      {
        type: String,
        trim: true,
      },
    ],

    lunch: [
      {
        type: String,
        trim: true,
      },
    ],

    dinner: [
      {
        type: String,
        trim: true,
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

dailyMenuSchema.index(
  {
    hallId: 1,
    menuDate: 1,
  },
  {
    unique: true,
  }
);

const DailyMenu = mongoose.model(
  "DailyMenu",
  dailyMenuSchema
);

export default DailyMenu;

