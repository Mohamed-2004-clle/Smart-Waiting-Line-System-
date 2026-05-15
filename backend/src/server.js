import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import { initSocket } from "./sockets/index.js";
import { startBackupScheduler } from "./jobs/backup.job.js";

const server = http.createServer(app);

const FRONTEND_BASE_URL =
  process.env.FRONTEND_BASE_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: FRONTEND_BASE_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

initSocket(io);
startBackupScheduler();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend allowed origin: ${FRONTEND_BASE_URL}`);
});