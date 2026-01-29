import ChatMessage from "../models/ChatMessage.js";
import User from "../models/User.js";

const roomUsers = {};
const getRandomColor = () => {
  const colors = ["#22c55e", "#3b82f6", "#a855f7", "#f97316", "#ef4444"];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const editorSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", ({ roomId, username }) => {
      socket.join(roomId);

      if (!roomUsers[roomId]) {
        roomUsers[roomId] = [];
      }

      const user = {
        id: socket.id,
        name: username,
        color: getRandomColor(),
      };

      roomUsers[roomId].push(user);

      io.to(roomId).emit("room-users", roomUsers[roomId]);
    });

    socket.on("chat-message", async ({ roomId, message, user }) => {
      const chat = await ChatMessage.create({
        roomId,
        username: user.name,
        color: user.color,
        message,
      });

      io.to(roomId).emit("chat-message", {
        username: chat.username,
        color: chat.color,
        message: chat.message,
        createdAt: chat.createdAt,
      });
    });

    socket.on("typing-start", ({ roomId, username }) => {
      socket.to(roomId).emit("user-typing", {
        username,
        isTyping: true,
      });
    });

    socket.on("typing-stop", ({ roomId, username }) => {
      socket.to(roomId).emit("user-typing", {
        username,
        isTyping: false,
      });
    });

    socket.on("code-change", ({ roomId, code }) => {
      socket.to(roomId).emit("code-update", code);
    });

    socket.on("disconnect", () => {
      for (const roomId in roomUsers) {
        roomUsers[roomId] = roomUsers[roomId].filter(
          (user) => user.id !== socket.id,
        );

        io.to(roomId).emit("room-users", roomUsers[roomId]);
      }
    });
  });
};
