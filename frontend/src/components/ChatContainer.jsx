import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { axiosInstance } from "../lib/axios";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Trash2, MoreVertical, FileText, Download, Image, FileVideo, FileAudio, FileBadge, File } from "lucide-react";
import toast from "react-hot-toast";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage, // Método deleteMessage importado diretamente do store
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [downloadingFiles, setDownloadingFiles] = useState({});

  // Função para eliminar uma mensagem com tratamento de erros
  const handleDeleteMessage = async (messageId) => {
    try {
      // Usar o método deleteMessage diretamente do store
      await deleteMessage(messageId);
      
      // Fechar menu após exclusão
      setActiveMessageMenu(null);
    } catch (error) {
      console.error("Erro ao eliminar mensagem:", error);
      toast.error("Erro ao eliminar mensagem");
    }
  };

  // Função otimizada para baixar qualquer tipo de ficheiro
  const downloadFile = async (messageId, fileName) => {
    try {
      if (!messageId || !fileName) {
        toast.error("Informações do ficheiro inválidas");
        return;
      }

      // Marcamos este ficheiro como sendo baixado
      setDownloadingFiles(prev => ({ ...prev, [messageId]: true }));

      // Mostrar toast de progresso
      const toastId = toast.loading("A iniciar download...");

      try {
        console.log("Iniciando download do ficheiro para mensagem:", messageId);

        // Fetch do ficheiro a partir do endpoint específico
        const response = await axiosInstance.get(`/messages/file/${messageId}`, {
          responseType: 'blob',
          timeout: 300000, // 5 minutos
        });
        
        if (!response || !response.data) {
          throw new Error(`Erro ao obter o ficheiro: Resposta vazia`);
        }
        
        // Obter o blob diretamente da resposta
        const blob = response.data;
        
        // Criar URL temporária para o blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Criar link e acionar download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Limpar
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          document.body.removeChild(link);
        }, 100);
        
        // Atualizar toast para sucesso
        toast.success("Download concluído", { id: toastId });
      } catch (error) {
        console.error("Erro ao fazer download:", error);
        toast.error(`Erro ao baixar ficheiro: ${error.message}`, { id: toastId });
      } finally {
        // Marcamos este ficheiro como não sendo mais baixado
        setDownloadingFiles(prev => {
          const newState = { ...prev };
          delete newState[messageId];
          return newState;
        });
      }
    } catch (error) {
      console.error("Erro ao processar download:", error);
      toast.error("Erro ao processar download");
    }
  };

  // Função para determinar ícone apropriado para o tipo de ficheiro
  const getFileIcon = (fileType) => {
    if (!fileType) return <File size={22} />;
    
    if (fileType.startsWith('image/')) return <Image size={22} />;
    if (fileType.startsWith('video/')) return <FileVideo size={22} />;
    if (fileType.startsWith('audio/')) return <FileAudio size={22} />;
    if (fileType.includes('pdf')) return <FileBadge size={22} />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText size={22} />;
    if (fileType.includes('excel') || fileType.includes('sheet')) return <FileText size={22} />;
    
    return <FileText size={22} />;
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
    <div className="h-screen supports-[height:100cqh]:h-[100cqh] supports-[height:100svh]:h-[100svh] flex-1 flex flex-col overflow-hidden">
      <ChatHeader />
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-100"
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
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[300px] max-w-[200px] rounded-md mb-2"
                />
              )}
              
              {message.file && (
                <div className="flex items-center gap-2 bg-base-200 p-2 rounded-md mb-2">
                  <div className="p-2 bg-base-100 rounded-md">
                    {getFileIcon(message.file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{message.file.name}</p>
                    <p className="text-xs opacity-70">{message.file.size || ''}</p>
                  </div>
                  <button
                    onClick={() => downloadFile(message._id, message.file.name)}
                    className="btn btn-sm btn-circle"
                    disabled={downloadingFiles[message._id]}
                  >
                    {downloadingFiles[message._id] ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <Download size={16} />
                    )}
                  </button>
                </div>
              )}
              
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