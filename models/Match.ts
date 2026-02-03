import mongoose, { Schema, models } from "mongoose";

const matchSchema = new Schema(
  {
    roomId: { type: String, required: true }, // 🔥 REQUIRED FOR MULTI MATCHES
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    mode: { type: String, enum: ["single", "multi"], required: true },
  },
  { timestamps: true }
);

// Each user only once per room
matchSchema.index({ roomId: 1, userId: 1 }, { unique: true });

export default models.Match || mongoose.model("Match", matchSchema, "matches");
