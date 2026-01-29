import express from "express";
import ChatMessage from "../models/ChatMessage.js";

const router = express.Router();

router.get("/:roomId", async (req, res) => {
  const { roomId } = req.params;

  try {
    const messages = await ChatMessage.find({ roomId }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to load chat" });
  }
});

export default router;
