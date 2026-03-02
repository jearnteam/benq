import mongoose from "mongoose";

const { Schema } = mongoose;

const QuestionPartSchema = new Schema(
  {
    text: { type: String, default: "" },
    underline: { type: Boolean, default: false },
    blank: { type: Boolean, default: false },
  },
  { _id: false } // ✅ THIS is the key
);

const ChoiceSchema = new Schema(
  {
    text: { type: String, required: true },
    correct: { type: Boolean, default: false },
  },
  { _id: false } // ✅ Also here
);

const QuestionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["vocabulary", "grammar", "reading", "listening"],
      required: true,
    },
    level: {
      type: String,
      enum: ["N5", "N4", "N3", "N2", "N1"],
      required: true,
    },
    questionParts: [QuestionPartSchema], // ✅ use sub-schema
    passage: { type: String, default: null },
    audioUrl: { type: String, default: null },
    choices: [ChoiceSchema], // ✅ use sub-schema
    explanation: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Question ||
  mongoose.model("Question", QuestionSchema);