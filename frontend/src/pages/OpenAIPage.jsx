import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import OpenAIChat from "../components/OpenAIChat"; // Importa o componente de interação com OpenAI

const OpenAIPage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-6xl h-[calc(100vh-8rem)]">
          <div className="flex h-full rounded-lg overflow-hidden">
            <Sidebar />

            {/* Exibe o componente de OpenAI ou o chat, dependendo da seleção */}
            <div className="flex-1">
              <h1 className="text-2xl font-semibold p-4">Interaja com o OpenAI</h1>
              {!selectedUser ? (
                <OpenAIChat /> // Exibe o chat com OpenAI se nenhum usuário estiver selecionado
              ) : (
                <ChatContainer /> // Exibe o ChatContainer se um usuário estiver selecionado
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpenAIPage;
