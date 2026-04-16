import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

export const joinTenantRoom = (tenantId) => {
  if (!tenantId) return;
  socket.emit("join_tenant", tenantId);
};

export default socket;