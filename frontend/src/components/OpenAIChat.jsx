import React, { useState } from "react";
import axios from "axios";

const OpenAIChat = () => {
  const [messages, setMessages] = useState([]);  // Armazena as mensagens do chat
  const [input, setInput] = useState("");         // Armazena a entrada do usuário
  const [loading, setLoading] = useState(false);  // Controle de carregamento

  const handleSendMessage = async () => {
    if (!input) return; // Não envia mensagem se o campo estiver vazio

    // Atualiza as mensagens com a mensagem do usuário
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");  // Limpa o campo de entrada
    setLoading(true);  // Ativa o carregamento

    try {
      // Envia a mensagem para o backend
      const response = await axios.post("http://localhost:5000/api/chat", {
        message: input,
      });

      // Recebe a resposta do backend (OpenAI)
      const chatGptReply = response.data.reply;

      // Atualiza o estado com a resposta do ChatGPT
      setMessages([
        ...newMessages,
        { role: "assistant", content: chatGptReply },
      ]);
    } catch (error) {
      console.error("Erro ao comunicar com o backend:", error);
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Desculpe, algo deu errado." },
      ]);
    } finally {
      setLoading(false);  // Desativa o carregamento
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-window">
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.role}>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua mensagem..."
        />
        <button onClick={handleSendMessage} disabled={loading}>
          {loading ? "Carregando..." : "Enviar"}
        </button>
      </div>
    </div>
  );
};

export default OpenAIChat;
