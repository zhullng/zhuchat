import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from 'express-rate-limit';
import path from "path";
import { connectDB } from "./lib/db.js";

import aiRoutes from './routes/ai.route.js';
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiRoutes, aiLimiter);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});

import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "../components/ChatHeader";
import MessageInput from "../components/MessageInput";
import { formatMessageTime } from "../lib/utils";
import { getAIResponse } from "../../../backend/src/lib/ai";

const AIChat = () => {
  const { authUser } = useAuthStore() || { authUser: {} };
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (input) => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      content: input,
      isAI: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await getAIResponse(input);
      if (!response || !response.trim()) {
        throw new Error("Resposta da IA inválida");
      }

      setMessages((prev) => [
        ...prev,
        {
          content: response,
          isAI: true,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Erro detalhado:", error);
      setMessages((prev) => [
        ...prev,
        {
          content: `Erro: ${error.message}`,
          isAI: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`chat ${message.isAI ? "chat-start" : "chat-end"}`}
            ref={messagesEndRef}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.isAI
                      ? "/bot-avatar.png"
                      : authUser?.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>

            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.timestamp)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col">
              <p>{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default AIChat;
