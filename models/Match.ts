import mongoose from "mongoose";

const MatchSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  player1: { type: String, required: true },
  player2: { type: String, required: true },
  status: { type: String, enum: ["active", "finished"], default: "active" },
  createdAt: { type: Date, default: Date.now },
});

// Prevent recompilation errors during hot reload
export default mongoose.models.Match || mongoose.model("Match", MatchSchema);
