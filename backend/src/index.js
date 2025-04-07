import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser"; 
import cors from "cors"; 
import path from "path"; 
import mongoose from "mongoose";
import { connectDB } from "./lib/db.js"; // Conexão com o MongoDB

import groupRoutes from "./routes/group.route.js";
import aiRoutes from './routes/ai.route.js';
import authRoutes from "./routes/auth.route.js"; 
import messageRoutes from "./routes/message.route.js";
import transferRoutes from "./routes/transfer.route.js";
import transactionRoutes from "./routes/transaction.route.js";
import contactRoutes from "./routes/contact.route.js";
import { app, server } from "./lib/socket.js"; // Inicializa app e server de socket

dotenv.config();

const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

// Configurações importantes para permitir uploads de arquivos grandes
app.use(express.json({ limit: '50mb' })); // Aumentar para 50MB
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Aumentar limites de timeout para requisições longas
app.use((req, res, next) => {
  req.setTimeout(600000); // 10 minutos
  res.setTimeout(600000); // 10 minutos
  next();
});

// Middlewares básicos
app.use(cookieParser());
app.use(cors({ 
  origin: process.env.CLIENT_URL || "*", 
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
  maxAge: 3600
}));

// Log de requisições para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Tamanho: ${req.headers['content-length'] || 'desconhecido'}`);
  next();
});

// Aumentar o timeout do servidor para uploads
server.timeout = 600000; // 10 minutos

// Rotas da API
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/groups", groupRoutes);

// Middleware para tratamento de erros mais específico
app.use((err, req, res, next) => {
  console.error("Erro detalhado de servidor:", {
    mensagem: err.message,
    pilha: err.stack,
    nome: err.name,
    código: err.code,
    status: err.statusCode || 500
  });
  
  const statusCode = err.statusCode || 500;
  const message = err.message || "Erro interno do servidor";
  
  res.status(statusCode).json({ 
    error: message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Serve frontend em produção
if (process.env.NODE_ENV === "production") {  
  app.use(express.static(path.join(__dirname, "../frontend/dist")));  
  app.get("*", (req, res) => {  
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Tratamento de exceções não capturadas
process.on("uncaughtException", (error) => {
  console.error("Exceção não capturada:", error);
  // Não encerrar o processo para manter o servidor funcionando
});

process.on("unhandledRejection", (error) => {
  console.error("Promessa rejeitada não tratada:", error);
  // Não encerrar o processo para manter o servidor funcionando
});

// Conectar banco antes de iniciar servidor
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Erro ao conectar ao banco de dados:", error);
  }); 