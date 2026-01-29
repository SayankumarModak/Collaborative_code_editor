import mongoose from "mongoose";

const versionSchema = new mongoose.Schema(
  {
    code: String,
    language: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    code: { type: String, default: "" },
    language: { type: String, default: "javascript" },
    versions: [versionSchema],
  },
  { timestamps: true },
);

export default mongoose.model("Room", roomSchema);
