import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  googleId: { type: String, unique: true },
  email: String,
  name: String,
  image: String,
  currentRoom: { type: String, default: null },
  role: { type: String, enum: ["p1", "p2", null], default: null },
  lastLogin: Date,
});

// Prevent recompilation errors during hot reload
export default mongoose.models.User || mongoose.model("User", UserSchema);
