import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

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

  // Depuração - mostra mensagens no console
  useEffect(() => {
    if (messages && messages.length > 0) {
      console.log("Mensagens carregadas:", messages);
    }
  }, [messages]);

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

  // Função otimizada para baixar qualquer tipo de ficheiro
  const downloadFile = async (fileUrl, fileName, messageId) => {
    try {
      if (!fileUrl || !fileName) {
        toast.error("Informações do ficheiro inválidas");
        return;
      }

      // Marcamos este ficheiro como sendo baixado
      setDownloadingFiles(prev => ({ ...prev, [messageId]: true }));

      // Mostrar toast de progresso
      const toastId = toast.loading("A iniciar download...");

      try {
        console.log("Iniciando download do ficheiro:", fileUrl);

        // Fetch do ficheiro a partir da URL
        const response = await fetch(fileUrl, {
          method: 'GET',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Erro ao obter o ficheiro: ${response.status}`);
        }
        
        // Verificar tamanho do ficheiro
        const contentLength = response.headers.get('content-length');
        const isLargeFile = contentLength && parseInt(contentLength, 10) > 50 * 1024 * 1024; // 50MB
        
        if (isLargeFile) {
          toast.loading("Processando ficheiro grande...", { id: toastId });
        }
        
        // Converter a resposta para blob
        const blob = await response.blob();
        
        // Tenta detectar o tipo correto do ficheiro
        let finalBlob = blob;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        
        // Corrigir tipo MIME para extensões comuns se não estiver correto
        const knownMimeTypes = {
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'ppt': 'application/vnd.ms-powerpoint',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'mp3': 'audio/mpeg',
          'mp4': 'video/mp4',
          'zip': 'application/zip',
          'txt': 'text/plain'
        };
        
        if (fileExtension && knownMimeTypes[fileExtension] && blob.type === 'application/octet-stream') {
          finalBlob = new Blob([blob], { type: knownMimeTypes[fileExtension] });
        }
        
        // Criar URL temporária para o blob
        const blobUrl = URL.createObjectURL(finalBlob);
        
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
                    onClick={() => downloadFile(message.file.url, message.file.name, message._id)}
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