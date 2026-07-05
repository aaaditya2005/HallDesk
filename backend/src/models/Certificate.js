import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    certificateRequestNumber: {
      type: String,
      required: true,
      unique: true,
    },

    certificateType: {
      type: String,
      enum: ["Leave", "Hostel Bonafide"],
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    hallId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hall",
      required: true,
    },

    leaveFromDate: {
      type: Date,
      default: null,
    },

    leaveToDate: {
      type: Date,
      default: null,
    },

    parentPhone: {
      type: String,
      default: null,
    },

    reason: {
      type: String,
      default: null,
    },

    purpose: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: null,
    },

    certificatePdfUrl: {
      type: String,
      default: null,
    },

    digitalSignatureUrl: {
      type: String,
      default: null,
    },

    remarks: {
      type: String,
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

const Certificate = mongoose.model(
  "Certificate",
  certificateSchema
);

export default Certificate;