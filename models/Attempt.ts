import { Schema, model, models, Types } from "mongoose";

const AttemptSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    correct: { type: Number, required: true },
    total: { type: Number, required: true },
    // store which day this attempt belongs to
    day: { type: String, required: true }, // yyyy-MM-dd
  },
  { timestamps: true }
);

export default models.Attempt || model("Attempt", AttemptSchema);
