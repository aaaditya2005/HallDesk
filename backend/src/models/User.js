import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const userSchema = new mongoose.Schema(
  {
    name: {
    type: String,
    required: true,
    trim: true,
    },

    username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    },

    email: {
    type: String,
    trim: true,
    lowercase: true,
    default: null,
    },

    password: {
    type: String,
    required: true,
    },

    phone: {
    type: String,
    default: null,
    },

    role: {
    type: String,
    enum: ["student", "warden", "mess_manager", "admin"],
    required: true,
    },

    hallId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hall",
    default: null,
    },

    isActive: {
    type: Boolean,
    default: true,
    },

    profilePhoto: {
    type: String,
    default: null,
    },

    lastLogin: {
    type: Date,
    },

    rollNo: {
    type: String,
    trim: true,
    uppercase: true,
    },

   registrationNo: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    },

    department: {
  type: String,
  enum: [
        "BT", // Biotechnology

        "CE", // Civil Engineering
        "CH", // Chemical Engineering
        "CS", // Computer Science & Engineering
        "EC", // Electronics & Communication Engineering
        "EE", // Electrical Engineering
        "ME", // Mechanical Engineering

        "MM", // Metallurgical & Materials Engineering

        "CY", // Chemistry
        "PH", // Physics
        "MA", // Mathematics

        "ES", // Earth & Environmental Studies
        "HS", // Humanities & Social Sciences
        "MS"  // Management Studies
        ],
    default: null,
    },

    course: {
    type: String,
    enum: ["BTech", "MTech", "PhD"],
    default: null,
    },

    currentYear: {
    type: Number,
    min: 1,
    max: 10,
    default: null,
    },

    roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    default: null,
    },

    parentPhone: {
    type: String,
    default: null,
    },

    gender: {
    type: String,
    enum: ["Male", "Female"],
    default: null,
    },
    // Warden Fields
    designation: {
    type: String,
    default: null,
    },

    officePhone: {
    type: String,
    default: null,
    },

    // Mess Manager Fields
    companyName: {
    type: String,
    default: null,
    },

    managerId: {
    type: String,
    default: null,
    },

    // Admin Fields
    adminLevel: {
    type: Number,
    default: null,
    },

  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function () {

  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(
    this.password,
    salt
  );
});


userSchema.methods.matchPassword =
  async function (enteredPassword) {
    return await bcrypt.compare(
      enteredPassword,
      this.password
    );
  };

  

const User = mongoose.model("User", userSchema);

export default User;