import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    image: {
      type: String,
      default: null,
    },

    displayName: {
      type: String,
      default: "",
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },

    ranks: {
      N5: {
        rating: { type: Number, default: 1000 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
      },
      N4: {
        rating: { type: Number, default: 1000 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
      },
      N3: {
        rating: { type: Number, default: 1000 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
      },
      N2: {
        rating: { type: Number, default: 1000 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
      },
      N1: {
        rating: { type: Number, default: 1000 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
      },
    },

    streak: { type: Number, default: 0 },
    lastStudyDate: { type: Date, default: null },

    currentRoom: { type: String, default: null },
    role: { type: String, enum: ["p1", "p2", null], default: null },

    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
