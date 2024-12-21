import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import axios from "axios"; // Importar o axios

// Assegurando que `__dirname` funcione corretamente no ESM
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url); // Pega o caminho do arquivo atual
const __dirname = path.dirname(__filename); // Obtém o diretório do arquivo atual

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173", // A URL do frontend
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Nova rota para comunicação com o OpenAI
app.post("/api/chat", async (req, res) => {
  const { message } = req.body; // Mensagem recebida do frontend

  if (!message) {
    return res.status(400).json({ error: "Mensagem não fornecida." });
  }

  try {
    // Fazendo a requisição para a OpenAI
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo", // Modelo GPT-3.5
        messages: [{ role: "user", content: message }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // Chave da API OpenAI
          "Content-Type": "application/json",
        },
      }
    );

    // Retorna a resposta da OpenAI
    const chatGptReply = response.data.choices[0].message.content;
    res.json({ reply: chatGptReply });
  } catch (error) {
    console.error("Erro ao chamar a OpenAI:", error);
    res.status(500).json({ error: "Erro ao comunicar com a OpenAI." });
  }
});

if (process.env.NODE_ENV === "production") {
  // Serve a versão estática do frontend (quando o aplicativo for compilado)
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  // Rota de fallback para quando o React não encontrar a URL
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});
