// src/socket.js
import { io } from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore.js";

let socket = null;

export const initializeSocket = () => {
  const authUser = useAuthStore.getState().authUser;
  
  if (!authUser) return null;
  if (socket) return socket;
  
  // Substitua pela URL do seu backend
  const BACKEND_URL = "https://zhuchat.onrender.com";
  
  socket = io(BACKEND_URL, {
    query: { userId: authUser._id },
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  
  socket.on("connect", () => {
    console.log("Socket conectado com ID:", socket.id);
  });
  
  socket.on("disconnect", () => {
    console.log("Socket desconectado");
  });
  
  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};