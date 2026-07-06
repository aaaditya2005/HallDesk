import mongoose from "mongoose";

const timelineSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },

  remark: {
    type: String,
    default: "",
  },

  by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  timestamp: {
    type: Date,
    default: Date.now,
  },
  
},
  {
    _id: false,
  }
);

const issueSchema = new mongoose.Schema(
  {
    issueNumber: {
    type: String,
    required: true,
    unique: true,
    },

    title: {
    type: String,
    required: true,
    trim: true,
    },

    description: {
    type: String,
    required: true,
    },

    category: {
    type: String,
    enum: [
        "Electrical",
        "Mess",
        "Infrastructure",
        "Cleanliness",
        "Water",
        "Internet",
        "Furniture",
        "Other",

    ],
    required: true,
    },

    reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    },



    hallId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hall",
    required: true,
    },

    roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    default: null,
    },

    // status: {
    // type: String,
    // enum: [
    //     "Pending",
    //     "Accepted",
    //     "In Progress",
    //     "Resolved",
    //     "Rejected",
    // ],

    // default: "Pending",
    // },

    status: {

    },

    priority: {
    type: String,
    enum: [
        "Low",
        "Medium",
        "High",
        "Critical",
    ],
    default: "Medium",
    },

    attachments: [
    {
        type: String,
    },
    ],

    supporters: [
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    ],

    assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    },

    timeline: [timelineSchema],

    lastUpdatedAt: {
    type: Date,
    default: Date.now,
    },

    resolvedAt: {
    type: Date,
    default: null,
    },

    resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    },

    rejectionReason: {
    type: String,
    default: null,
    },

    feedback: {
    type: String,
    default: null,
    },

    rating: {
    type: Number,
    min: 1,
    max: 5,
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

const Issue = mongoose.model("Issue", issueSchema);

export default Issue;
