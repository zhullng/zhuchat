import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Trash2, MoreVertical, FileText, Download, Image as ImageIcon, FilePlus } from "lucide-react";
import toast from "react-hot-toast";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);

  // Efeito para carregar mensagens e configurar a subscrição de mensagens
  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    
    // Resetar estado de scroll inicial quando mudar de conversa
    setInitialScrollDone(false);
    setActiveMessageMenu(null);
    
    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  // Efeito para scroll automático quando as mensagens são carregadas inicialmente
  useEffect(() => {
    // Se não estiver carregando e temos mensagens
    if (!isMessagesLoading && messages.length > 0 && !initialScrollDone) {
      // Esperar um pouco para as mensagens renderizarem
      setTimeout(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: "auto" });
          setInitialScrollDone(true);
        }
      }, 100);
    }
  }, [messages, isMessagesLoading, initialScrollDone]);

  // Efeito separado para fazer scroll quando chegar uma nova mensagem
  useEffect(() => {
    // Só fazemos o scroll para novas mensagens se já tivermos feito o scroll inicial
    if (initialScrollDone && messageEndRef.current && messages.length > 0) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, initialScrollDone]);

  // Fechar menu quando clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeMessageMenu && !e.target.closest('.message-menu-container')) {
        setActiveMessageMenu(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMessageMenu]);

  // Função para eliminar uma mensagem
  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId);
      toast.success("Mensagem eliminada com sucesso");
    } catch (error) {
      console.error("Erro ao eliminar mensagem:", error);
      toast.error("Erro ao eliminar mensagem");
    } finally {
      setActiveMessageMenu(null);
    }
  };

  // Determinar o ícone do arquivo com base no tipo MIME
  const getFileIcon = (fileType) => {
    if (!fileType) return <FileText size={24} className="text-primary" />;
    
    if (fileType.startsWith('image/')) return <ImageIcon size={24} className="text-blue-500" />;
    if (fileType.startsWith('video/')) return <FilePlus size={24} className="text-red-500" />;
    if (fileType.startsWith('audio/')) return <FilePlus size={24} className="text-yellow-500" />;
    if (fileType.includes('pdf')) return <FileText size={24} className="text-red-500" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText size={24} className="text-blue-600" />;
    if (fileType.includes('excel') || fileType.includes('sheet')) return <FileText size={24} className="text-green-600" />;
    
    return <FileText size={24} className="text-primary" />;
  };

  // Determina o nome a ser exibido para o usuário selecionado (nickname ou nome real)
  const selectedUserDisplayName = selectedUser.note || selectedUser.fullName || 'Nome Desconhecido';

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="h-screen supports-[height:100cqh]:h-[100cqh] supports-[height:100svh]:h-[100svh] flex-1 flex flex-col overflow-auto pb-5">
      <ChatHeader />
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>

            {/* Alteração do layout do cabeçalho para a posição do nome */}
            <div className={`chat-header mb-1 flex items-center ${message.senderId === authUser._id ? "justify-end" : "justify-start"}`}>
              {/* Para o user logado (authUser), o nome estará à direita e o horário à esquerda */}
              {message.senderId === authUser._id ? (
                <>
                  <time className="text-xs opacity-50">
                    {formatMessageTime(message.createdAt)}
                  </time>
                  <span className="font-semibold text-sm ml-2 flex items-center">
                    {authUser.fullName || 'Nome Desconhecido'}
                    
                    {/* Botão de opções movido para perto do nome */}
                    <div className="message-menu-container ml-1 relative">
                      <button 
                        onClick={() => setActiveMessageMenu(activeMessageMenu === message._id ? null : message._id)} 
                        className="p-1 rounded-full hover:bg-base-300 transition-colors"
                      >
                        <MoreVertical size={14} />
                      </button>
                      
                      {/* Menu de opções */}
                      {activeMessageMenu === message._id && (
                        <div className="absolute right-0 mt-1 bg-base-100 shadow-md rounded-md border border-base-300 z-10">
                          <button
                            onClick={() => handleDeleteMessage(message._id)}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-base-200 text-error w-full text-left whitespace-nowrap"
                          >
                            <Trash2 size={16} />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </span>
                </>
              ) : (
                // Para o outro user (selectedUser), o nome estará à esquerda e o horário à direita
                <>
                  <span className="font-semibold text-sm">
                    {selectedUserDisplayName}
                  </span>
                  <time className="text-xs opacity-50 ml-2">
                    {formatMessageTime(message.createdAt)}
                  </time>
                </>
              )}
            </div>

            <div className="chat-bubble flex flex-col relative">
              {/* Exibir imagem, se existir */}
              {message.image && (
                <a 
                  href={message.image} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mb-2"
                >
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md"
                    loading="lazy"
                  />
                </a>
              )}

              {/* Exibir arquivo, se existir */}
              {message.file && message.file.url && (
                <a 
                  href={message.file.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center p-2 bg-base-200 rounded-md mb-2 hover:bg-base-300 transition-colors"
                >
                  <div className="mr-2">
                    {getFileIcon(message.file.type)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-medium text-sm truncate">{message.file.name || "Arquivo"}</p>
                    <p className="text-xs opacity-70">Clique para baixar</p>
                  </div>
                  <Download size={16} className="ml-2 opacity-70" />
                </a>
              )}
              
              {/* Texto da mensagem */}
              {message.text && (
                <p className="break-words whitespace-pre-wrap">{message.text}</p>
              )}
            </div>
          </div>
        ))}
        {/* Referência para o final da lista de mensagens */}
        <div ref={messageEndRef}></div>
      </div>
      <MessageInput />
    </div>
  );
};

export default ChatContainer;