import mongoose, { Schema, models } from "mongoose";

const matchPlaySchema = new Schema(
  {
    roomId: { type: String, default: null },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    mode: { type: String, enum: ["single", "multi"], required: true },
  },
  { timestamps: true }
);

export default models.MatchPlay ||
  mongoose.model("MatchPlay", matchPlaySchema);
