import mongoose from "mongoose";

const AttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    correct: Number,
    total: Number,

    // yyyy-MM-dd (used for streak / heatmap)
    day: {
      type: String,
      index: true,
    },

    // NEW ✅
    mode: {
      type: String,
      enum: ["normal", "rank"],
      default: "normal",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Attempt ||
  mongoose.model("Attempt", AttemptSchema);
