import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema(
  {
    text: String,
    options: [String],
    answer: Number,
    level: {
      type: String,
      enum: ["N5", "N4", "N3", "N2", "N1"],
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Question ||
  mongoose.model("Question", QuestionSchema);
