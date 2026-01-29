import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true },
    username: { type: String, required: true },
    color: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("ChatMessage", chatMessageSchema);
