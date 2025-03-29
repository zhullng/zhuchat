import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser"; 
import cors from "cors"; 
import path from "path"; 
import { connectDB } from "./lib/db.js"; // Conexão com o MongoDB

import aiRoutes from './routes/ai.route.js';
import authRoutes from "./routes/auth.route.js"; 
import messageRoutes from "./routes/message.route.js";
import transferRoutes from "./routes/transfer.route.js"; // ✅ Corrigido
import transactionRoutes from "./routes/transaction.route.js"; // Nova rota para transações
import contactRoutes from "./routes/contact.route.js";
import { app, server } from "./lib/socket.js"; // Inicializa app e server de socket

dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve();

// Middlewares com limites aumentados para suportar uploads maiores
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(cors({ origin: "*", credentials: true }));

// Aumentar o timeout da conexão HTTP para uploads grandes
server.timeout = 300000; // 5 minutos

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/transfers", transferRoutes); // ✅ Corrigido
app.use("/api/transactions", transactionRoutes); // Nova rota para transações
app.use("/api/contacts", contactRoutes);

// Serve frontend em produção
if (process.env.NODE_ENV === "production") {  
  app.use(express.static(path.join(__dirname, "../frontend/dist")));  
  app.get("*", (req, res) => {  
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Conectar banco antes de iniciar servidor
connectDB();
server.listen(PORT, () => {
  console.log("Server is running on PORT:" + PORT);
});