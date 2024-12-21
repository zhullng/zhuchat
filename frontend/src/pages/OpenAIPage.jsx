import React from "react";
import OpenAIChat from "../components/OpenAIChat";  // Importa o componente de chat com OpenAI

const OpenAIPage = () => {
  return (
    <div className="openai-page">
      <h1>OpenAI</h1>
      <OpenAIChat />  {/* Exibe o chat na página */}
    </div>
  );
};

export default OpenAIPage;
