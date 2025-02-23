import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser"; 
import cors from "cors"; 
import path from "path"; 
import { connectDB } from "./lib/db.js"; // Função para conectar ao banco de dados

import aiRoutes from './routes/ai.route.js';
import authRoutes from "./routes/auth.route.js"; 
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js"; // Inicializa app e server de socket

dotenv.config(); // Carrega variáveis de ambiente

const PORT = process.env.PORT; // Define a porta do servidor
const __dirname = path.resolve(); // Caminho absoluto do diretório (para mudanças de pastas)

app.use(express.json()); // Middleware para tratar JSON
app.use(cookieParser()); // Middleware para tratar cookies
app.use(
  cors({
    origin: "*", // Permite requisições de qualquer origem (apenas para testes)
    credentials: true,
  })
);


app.use("/api/auth", authRoutes); 
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiRoutes); 

if (process.env.NODE_ENV === "production") { // Verifica ambiente de produção
  app.use(express.static(path.join(__dirname, "../frontend/dist"))); // Receber arquivos estáticos

  app.get("*", (req, res) => { // Rota para receber index.html
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => { // Inicia o servidor na porta especificada
  console.log("server is running on PORT:" + PORT);
  connectDB(); // Conecta ao banco de dados
});
