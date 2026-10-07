import { io } from "socket.io-client";
import notify from "../utils/toast";

let socket = null;
let currentHallId = null;
let socketUsers = 0;
let redirectingToLogin = false;
const socketUrl = import.meta.env.VITE_SOCKET_URL
  || (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

const joinRoom = (hallId) => {
  if (!socket || !socket.connected) return;
  if (hallId === "global") {
    socket.emit("join-global");
  } else if (hallId) {
    socket.emit("join-hall", hallId);
  }
};

const leaveRoom = (hallId) => {
  if (!socket || !socket.connected) return;
  if (hallId === "global") {
    socket.emit("leave-global");
  } else if (hallId) {
    socket.emit("leave-hall", hallId);
  }
};

export const connectSocket = (hallId = null) => {
  if (!socket) {
    console.log(`Initializing socket client to ${socketUrl}`);
    socket = io(socketUrl, {
      transports: ["websocket"],
      auth: { token: localStorage.getItem("token") },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected (client):', socket.id);
      if (currentHallId) {
        joinRoom(currentHallId);
      }
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect_error:', err);
      if (err.message === "Invalid socket authentication." || err.message === "Socket account is inactive.") {
        if (redirectingToLogin) return;
        redirectingToLogin = true;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        notify.error("Your session has expired. Please log in again.");
        window.setTimeout(() => window.location.replace("/"), 100);
      }
    });
    socket.on('reconnect_attempt', (n) => console.log('Socket reconnect attempt', n));
  }

  socketUsers += 1;

  if (currentHallId !== hallId) {
    if (socket.connected && currentHallId) {
      leaveRoom(currentHallId);
    }
    currentHallId = hallId;
    if (socket.connected && currentHallId) {
      joinRoom(currentHallId);
    }
  }

  return socket;
};

export const disconnectSocket = () => {
  if (!socket) return;
  socketUsers -= 1;
  if (socketUsers > 0) return;

  if (currentHallId) {
    leaveRoom(currentHallId);
  }

  currentHallId = null;
  socketUsers = 0;
};

export default socket;
