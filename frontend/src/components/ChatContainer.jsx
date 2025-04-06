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
    deleteMessage,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [downloadingFiles, setDownloadingFiles] = useState({});

  // Função para rolar para a última mensagem
  const scrollToLatestMessage = () => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ 
        behavior: messages.length > 5 ? "smooth" : "auto", 
        block: "end" 
      });
      setInitialScrollDone(true);
    }
  };

  // Efeito para carregar mensagens e configurar a subscrição de mensagens
  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    
    // Resetar estado de scroll inicial quando mudar de conversa
    setInitialScrollDone(false);
    setActiveMessageMenu(null);
    
    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  // Efeito para scroll automático quando as mensagens são carregadas
  useEffect(() => {
    if (!isMessagesLoading && messages.length > 0 && !initialScrollDone) {
      // Usar setTimeout para garantir que o DOM tenha sido renderizado
      setTimeout(scrollToLatestMessage, 100);
    }
  }, [messages, isMessagesLoading, initialScrollDone]);

  // Efeito para scroll quando novas mensagens chegam
  useEffect(() => {
    if (initialScrollDone && messages.length > 0) {
      scrollToLatestMessage();
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

  // Função para eliminar uma mensagem com tratamento de erros
  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId);
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

  // Função para baixar arquivo base64
  const downloadBase64File = (base64Data, fileName, fileType) => {
    try {
      // Mostrar toast de progresso
      const toastId = toast.loading("Preparando download...");
      
      // Extrair dados base64 (remover o prefixo "data:...")
      const base64Content = base64Data.split(';base64,').pop();
      
      // Converter base64 para Blob
      const byteCharacters = atob(base64Content);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type: fileType });
      
      // Criar URL do Blob
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
      console.error("Erro ao fazer download do arquivo:", error);
      toast.error("Erro ao baixar arquivo. Tente novamente.");
    }
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
        {messages.map((message) => {
          // Verifique se a mensagem contém um arquivo (que foi enviado como imagem)
          let fileMetadata = null;
          if (message.text) {
            try {
              const parsedText = JSON.parse(message.text);
              if (parsedText && parsedText.isFile) {
                fileMetadata = parsedText;
              }
            } catch (e) {
              // Não é um JSON válido, então é uma mensagem de texto normal
            }
          }

          return (
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
                {/* Renderizar arquivo (enviado como imagem) */}
                {message.image && fileMetadata && (
                  <div className="flex items-center gap-2 bg-base-200 p-2 rounded-md mb-2">
                    <div className="p-2 bg-base-100 rounded-md">
                      {getFileIcon(fileMetadata.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fileMetadata.fileName}</p>
                      <p className="text-xs opacity-70">{fileMetadata.fileSize}</p>
                    </div>
                    <button
                      onClick={() => downloadBase64File(message.image, fileMetadata.fileName, fileMetadata.fileType)}
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
                
                {/* Renderizar imagem (não arquivo) */}
                {message.image && !fileMetadata && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[300px] max-w-[200px] rounded-md mb-2"
                  />
                )}
                
                {/* Renderizar arquivo normal */}
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
                
                {/* Renderizar texto apenas se não for um JSON de arquivo */}
                {message.text && !fileMetadata && (
                  <p className="break-words whitespace-pre-wrap">{message.text}</p>
                )}
              </div>
            </div>
          );
        })}
        {/* Referência para o final da lista de mensagens */}
        <div ref={messageEndRef}></div>
      </div>
      <MessageInput />
    </div>
  );
};

export default ChatContainer;