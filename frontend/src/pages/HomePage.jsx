// pages/HomePage.jsx
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import GroupChatContainer from "../components/GroupChatContainer";
import AIChat from "./AIChat";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";

const HomePage = () => {
  const { selectedUser, setSelectedUser, resetChatState } = useChatStore();
  const { selectedGroup, selectGroup, resetGroupState } = useGroupStore();
  const isAI = selectedUser?.isAI;
  const [isMobile, setIsMobile] = useState(false);

  // Detectar se é dispositivo móvel
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Checar tamanho inicial
    checkMobile();
    
    // Adicionar listener para redimensionamento
    window.addEventListener('resize', checkMobile);
    
    // Limpar listener ao desmontar
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Limpar estado dos chats quando desmontar o componente
  useEffect(() => {
    return () => {
      resetChatState();
      resetGroupState();
    };
  }, [resetChatState, resetGroupState]);

  // Função para voltar à lista de contatos no mobile
  const handleBackToList = () => {
    setSelectedUser(null);
    selectGroup(null);
  };

  // No mobile, se tiver um chat selecionado, esconder o sidebar e mostrar apenas o chat
  const isActiveChat = selectedUser || selectedGroup;

  return (
    <div className="h-screen bg-base-100">
      <div className="flex h-full pl-16 sm:pl-20">
        {/* Sidebar - escondido no mobile quando um chat estiver ativo */}
        {(!isMobile || !isActiveChat) && (
          <div className={`${isMobile ? 'w-full' : 'w-80'} h-full border-r border-base-300`}>
            <Sidebar />
          </div>
        )}
        
        {/* Área de chat - ocupa toda a largura no mobile quando um chat estiver ativo */}
        {(!isMobile || isActiveChat) && (
          <div className={`${isMobile && isActiveChat ? 'w-full' : 'flex-1'} flex`}>
            {isAI ? (
              <AIChat setSelectedUser={setSelectedUser} isMobile={isMobile} onBack={handleBackToList} />
            ) : selectedUser ? (
              <ChatContainer isMobile={isMobile} onBack={handleBackToList} />
            ) : selectedGroup ? (
              <GroupChatContainer isMobile={isMobile} onBack={handleBackToList} />
            ) : !isMobile && (
              <NoChatSelected />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;