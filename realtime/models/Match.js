import mongoose from "mongoose";

const MatchSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  player1: String,
  player2: String,

  status: { type: String, enum: ["active", "finished"], default: "active" },

  questions: Array, // pulled from Question DB
  currentQuestionIndex: { type: Number, default: 0 },

  scores: {
    type: Map,
    of: Number,
    default: {},
  },

  answers: {
    type: Map,
    of: Array,
    default: {},
  },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Match ||
  mongoose.model("Match", MatchSchema);
