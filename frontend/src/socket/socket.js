import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

export const joinTenantRoom = (tenantId) => {
  if (!tenantId) return;
  socket.emit("join_tenant", tenantId);
};

export default socket;