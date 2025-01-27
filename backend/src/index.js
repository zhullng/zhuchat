import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser"; 
import cors from "cors"; 

import path from "path"; 

import { connectDB } from "./lib/db.js"; // Função para conectar a bd

import authRoutes from "./routes/auth.route.js"; 
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js"; // Inicializa app e server de socket

dotenv.config(); // Carrega variáveis de ambiente

const PORT = process.env.PORT; // Define a porta
const __dirname = path.resolve(); // Retorna o caminho absoluto do diretório (para casos de mudanças de pastas)

app.use(express.json()); // Middleware para tratar JSON
app.use(cookieParser()); // Middleware para tratar cookies
app.use(
  cors({
    origin: "http://localhost:5173", // Permite requisições ao server
    credentials: true, // Permite o envio de cookies e credenciais com a requisição (como sessões ou autenticação)
  })
);

app.use("/api/auth", authRoutes); 
app.use("/api/messages", messageRoutes);


if (process.env.NODE_ENV === "production") { // Verifica ambiente de produção
  app.use(express.static(path.join(__dirname, "../frontend/dist"))); // Receber arquivos estáticos

  app.get("*", (req, res) => { // Receber o index para todas as outras rotas
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => { // Inicia o server na porta especificada
  console.log("server is running on PORT:" + PORT);
  connectDB(); 
});
