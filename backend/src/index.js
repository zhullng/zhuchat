import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser"; 
import cors from "cors"; 
import path from "path"; 
import compression from "compression"; // Adicionar compressão para melhor performance
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

const PORT = process.env.PORT;
const __dirname = path.resolve();

// Middlewares com limites aumentados para suportar uploads maiores
app.use(express.json({ 
  limit: '100mb',
  parameterLimit: 100000,
  extended: true
}));

app.use(express.urlencoded({ 
  limit: '100mb', 
  extended: true,
  parameterLimit: 100000
}));

app.use(cookieParser());

// Configuração CORS otimizada
app.use(cors({ 
  origin: process.env.NODE_ENV === "production" ? 
    [process.env.FRONTEND_URL || "http://localhost:3000", "*"] : 
    "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Compressão para respostas - reduz tamanho de transferência
app.use(compression({
  // Não comprimir imagens ou vídeos que já são comprimidos
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    const contentType = res.getHeader('Content-Type') || '';
    if (contentType.includes('image/') || contentType.includes('video/')) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));

// Aumentar o timeout da conexão HTTP para uploads grandes
server.timeout = 600000; // 10 minutos (era 5 minutos)

// Configurar timeouts para requisições longas
app.use((req, res, next) => {
  req.setTimeout(600000); // 10 minutos
  res.setTimeout(600000); // 10 minutos
  next();
});

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/groups", groupRoutes);

// Serve frontend em produção
if (process.env.NODE_ENV === "production") {  
  app.use(express.static(path.join(__dirname, "../frontend/dist")));  
  app.get("*", (req, res) => {  
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Configuração de tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err.stack);
  
  // Erros específicos para upload de arquivos grandes
  if (err instanceof SyntaxError && err.status === 413) {
    return res.status(413).json({ 
      error: "Arquivo muito grande. O tamanho máximo permitido é 100MB." 
    });
  }
  
  // Erro genérico
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production" ? 
      "Ocorreu um erro no servidor. Tente novamente mais tarde." : 
      err.message
  });
});

// Conectar banco antes de iniciar servidor
connectDB();
server.listen(PORT, () => {
  console.log("Server is running on PORT:" + PORT);
});