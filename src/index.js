// server/src/index.js
import chatRoutes from "./routes/chatRoutes.js";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { editorSocket } from "./sockets/editorSocket.js";
import runCodeRoute from "./routes/runCode.js";
import connectDB from "./config/db.js";
import { config } from "dotenv";
import roomRoutes from "./routes/roomRoutes.js";
import proxyRoute from "./routes/proxyRoute.js";
import authRoutes from "./routes/authRoutes.js";
import jwt from "jsonwebtoken";

config();
const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite default
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// Log all API requests for easier debugging
app.use("/api", (req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/chat", chatRoutes);

app.use("/api", runCodeRoute);
app.use("/api", proxyRoute);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // { userId, email }
    next();
  } catch (err) {
    return next(new Error("Invalid token"));
  }
});

editorSocket(io);

server.listen(5000, () => {
  console.log("Server running on port 5000");
});

// Global error handlers to avoid silent crashes and connection resets
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
