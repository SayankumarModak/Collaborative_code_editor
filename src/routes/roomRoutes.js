import express from "express";
import Room from "../models/Room.js";

const router = express.Router();

router.get("/:roomId/versions", async (req, res) => {
  const { roomId } = req.params;

  try {
    const room = await Room.findOne({ roomId });

    if (!room) return res.json([]);

    res.json(room.versions.reverse()); // latest first
  } catch (error) {
    res.status(500).json({ error: "Failed to load versions" });
  }
});

/**
 * Load room code
 */
router.get("/:roomId", async (req, res) => {
  const { roomId } = req.params;

  try {
    let room = await Room.findOne({ roomId });

    if (!room) {
      room = await Room.create({ roomId });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ error: "Failed to load room" });
  }
});

/**
 * Save room code
 */
router.post("/save", async (req, res) => {
  const { roomId, code, language } = req.body;

  try {
    await Room.findOneAndUpdate(
      { roomId },
      {
        code,
        language,
        $push: {
          versions: {
            code,
            language,
          },
        },
      },
      { upsert: true },
    );

    res.json({ message: "Code saved" });
  } catch (error) {
    res.status(500).json({ error: "Failed to save code" });
  }
});

export default router;
