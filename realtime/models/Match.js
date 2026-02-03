import mongoose from "mongoose";

const PlayerResultSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    score: { type: Number, required: true },
    correct: { type: Number, default: 0 }, // optional
    wrong: { type: Number, default: 0 },   // optional
  },
  { _id: false }
);

const MatchSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },

  mode: {
    type: String,
    enum: ["multi", "solo"],
    default: "multi",
  },

  players: {
    type: [PlayerResultSchema],
    required: true,
    validate: {
      validator: function (v) {
        return Array.isArray(v) && v.length >= 1;
      },
      message: "A match must have at least one player",
    },
  },

  totalQuestions: { type: Number, required: true },

  winnerId: { type: String, default: null }, // null = draw
  isDraw: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Match ||
  mongoose.model("Match", MatchSchema);
