import mongoose from "mongoose";

const messExpenseSchema = new mongoose.Schema(
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

    expenseDate: {
      type: Date,
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: null,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      enum: [
        "Vegetables",
        "Groceries",
        "Milk",
        "Gas",
        "Cleaning",
        "Maintenance",
        "Other",
      ],
      required: true,
    },

    attachments: [
      {
        type: String,
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

const MessExpense = mongoose.model(
  "MessExpense",
  messExpenseSchema
);

export default MessExpense;