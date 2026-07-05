import mongoose from "mongoose";

const voteSchema = new mongoose.Schema({
  pollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Poll",
    required: true,
  },

  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  selectedOption: {
    type: String,
    required: true,
  },

  votedAt: {
    type: Date,
    default: Date.now,
  },
});


voteSchema.index(
  {
    pollId: 1,
    studentId: 1,
  },
  {
    unique: true,
  }
);

const Vote = mongoose.model("Vote", voteSchema);

export default Vote;