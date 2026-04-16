let ioInstance = null;

export const initSocket = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join_tenant", (tenantId) => {
      if (!tenantId) return;

      socket.join(`tenant:${tenantId}`);
      console.log(`Socket ${socket.id} joined tenant:${tenantId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized");
  }

  return ioInstance;
};

export const emitToTenant = (tenantId, eventName, payload) => {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized");
  }

  ioInstance.to(`tenant:${tenantId}`).emit(eventName, payload);
};