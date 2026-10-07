import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "./config/prisma.js";
import { corsOptions } from "./config/security.js";

let ioInstance = null;

export const getHallRoomName = (hallId) => `hall:${hallId}`;
export const getHallStaffRoomName = (hallId) => `hall:${hallId}:staff`;
export const getUserRoomName = (userId) => `user:${userId}`;
export const getGlobalRoomName = () => "hall:all";
export const getSocketEventRoom = (hallId) => getHallRoomName(hallId);

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: corsOptions,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required."));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true, hallId: true, isActive: true },
      });
      if (!user || !user.isActive) return next(new Error("Socket account is inactive."));
      socket.user = { ...user, _id: user.id };
      return next();
    } catch {
      return next(new Error("Invalid socket authentication."));
    }
  });

  ioInstance = io;

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.join(getUserRoomName(socket.user.id || socket.user._id));
    if (socket.user.role === "admin") socket.join(getGlobalRoomName());
    if (socket.user.hallId) {
      socket.join(getHallRoomName(socket.user.hallId));
      if (socket.user.role === "warden") socket.join(getHallStaffRoomName(socket.user.hallId));
    }

    socket.on("join-hall", (hallId) => {
      if (!hallId) return;
      const ownHallId = socket.user.hallId?.toString();
      if (socket.user.role !== "admin" && ownHallId !== String(hallId)) return;
      socket.join(getHallRoomName(hallId));
      if (socket.user.role === "warden") socket.join(getHallStaffRoomName(hallId));
    });

    socket.on("leave-hall", (hallId) => {
      if (!hallId) return;
      socket.leave(getHallRoomName(hallId));
      socket.leave(getHallStaffRoomName(hallId));
    });

    socket.on("join-global", () => {
      if (socket.user.role === "admin") socket.join(getGlobalRoomName());
    });

    socket.on("leave-global", () => {
      socket.leave(getGlobalRoomName());
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

export const emitHallEvent = (hallId, eventName, payload) => {
  if (!ioInstance) return;
  try {
    if (hallId) {
      console.log(`Emitting event ${eventName} to hall ${hallId}:`, payload);
      ioInstance.to(getHallRoomName(hallId)).emit(eventName, payload);
    }
    console.log(`Emitting event ${eventName} to global room:`, payload);
    ioInstance.to(getGlobalRoomName()).emit(eventName, payload);
  } catch (err) {
    console.error("Failed to emit hall event", err);
  }
};

export const emitUserEvent = (userId, eventName, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(getUserRoomName(userId)).emit(eventName, payload);
};

export const emitHallStaffEvent = (hallId, eventName, payload) => {
  if (!ioInstance || !hallId) return;
  ioInstance.to(getHallStaffRoomName(hallId)).emit(eventName, payload);
  ioInstance.to(getGlobalRoomName()).emit(eventName, payload);
};

export default initSocket;
