import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
  level: { type: String, default: "N5" }, // JLPT level
  text: { type: String, required: true },
  options: { type: [String], required: true }, // 4 choices
  answer: { type: Number, required: true }, // index 0-3
});

export default mongoose.models.Question ||
  mongoose.model("Question", QuestionSchema);
