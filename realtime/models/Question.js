import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
  level: { type: String, default: "N5" },
  text: { type: String, required: true },
  options: { type: [String], required: true },
  answer: { type: Number, required: true }, // index
});

export default mongoose.models.Question ||
  mongoose.model("Question", QuestionSchema);
