import { useChatStore } from "../store/useChatStore"; // Hook para saber o estado do chat
import { useEffect, useRef } from "react"; // useEffect para efeitos colaterais e useRef para referências

import ChatHeader from "./ChatHeader"; 
import MessageInput from "./MessageInput"; 
import MessageSkeleton from "./skeletons/MessageSkeleton"; 
import { useAuthStore } from "../store/useAuthStore"; // Hook para saber o estado da autenticação
import { formatMessageTime } from "../lib/utils"; // Função para a data das mensagens

const ChatContainer = () => {
  const {
    messages, // Lista de mensagens
    getMessages, // Função para receber mensagens
    isMessagesLoading, // Estado de carregamento das mensagens
    selectedUser,  // User selecionado
    subscribeToMessages, // Subscrição para receber novas mensagens em tempo real
    unsubscribeFromMessages, // Função para cancelar subscrição
  } = useChatStore();

  const { authUser } = useAuthStore(); // User autenticado
  const messageEndRef = useRef(null); // Referência para o final da lista de mensagens

  // Efeito para buscar mensagens do selecionado
  useEffect(() => {
    getMessages(selectedUser._id); // Recebe mensagem
    subscribeToMessages(); // Sub para novas mensagens em tempo real

    return () => unsubscribeFromMessages(); // Cancela
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  // Scroll para baixo quando surgem novas mensagens...
  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Renderiza o esqueleto se as mensagens ainda estiverem a carregar
  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader /> 
        <MessageSkeleton />
        <MessageInput /> 
      </div>
    );
  }

  // Renderiza o conteúdo do chat
  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader /> 

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id} // Chave única da mensagem
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef} // Referência para scroll
          >
            {/* Avatar da mensagem */}
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png" // Foto do autenticado
                      : selectedUser.profilePic || "/avatar.png" // Foto do destinatário
                  }
                  alt="profile pic"
                />
              </div>
            </div>

            {/* Cabeçalho da mensagem */}
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)} {/* Formata e mostra data|hora da mensagem */}
              </time>
            </div>

            {/* Conteúdo da mensagem */}
            <div className="chat-bubble flex flex-col">
              {/* Anexo de imagem, se existir */}
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {/* Texto da mensagem, se existir */}
              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
