import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { axiosInstance } from "../lib/axios";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime, isMobileDevice, normalizeVideoDataURI } from "../lib/utils";
import { Trash2, MoreVertical, FileText, Download, Image, FileVideo, FileAudio, FileBadge, File } from "lucide-react";
import toast from "react-hot-toast";

// Componente de fallback para vídeos que não reproduzem
const VideoFallback = ({ fileData, onDownload }) => {
  return (
    <div className="flex flex-col items-center gap-3 p-4 border border-base-300 rounded-lg bg-base-200">
      <div className="flex items-center justify-center bg-base-100 p-6 rounded-lg">
        <FileVideo size={48} />
      </div>
      <p className="text-center">
        <span className="font-medium">Não foi possível reproduzir o vídeo.</span><br />
        <span className="text-sm opacity-70">Formato não suportado por este navegador.</span>
      </p>
      <button 
        onClick={onDownload}
        className="btn btn-sm btn-primary"
      >
        <Download size={16} />
        <span>Baixar Vídeo</span>
      </button>
    </div>
  );
};

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
  const [videoErrors, setVideoErrors] = useState({});

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
    setVideoErrors({});
    
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

  // Registra função global para download de fallback
  useEffect(() => {
    window.downloadVideoFallback = (messageId) => {
      const message = messages.find(m => m._id === messageId);
      if (message && message.fileData) {
        try {
          const fileData = JSON.parse(message.fileData);
          downloadFileFromBase64(fileData);
        } catch (e) {
          console.error("Erro ao processar dados para download:", e);
          toast.error("Erro ao preparar download");
        }
      }
    };
    
    return () => {
      delete window.downloadVideoFallback;
    };
  }, [messages]);

  // Função para lidar com erros de vídeo
  const handleVideoError = (messageId) => {
    setVideoErrors(prev => ({
      ...prev,
      [messageId]: true
    }));
  };

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
  
  // Função para baixar arquivo armazenado como base64 diretamente
  const downloadFileFromBase64 = (fileData) => {
    try {
      // Mostrar toast de progresso
      const toastId = toast.loading("Preparando download...");
      
      // Verificar se os dados são válidos
      if (!fileData || !fileData.data || !fileData.name) {
        toast.error("Dados do arquivo inválidos", { id: toastId });
        return;
      }
      
      // Já temos os dados base64 diretamente
      const base64Data = fileData.data;
      
      // Extrair a parte de dados do base64
      const base64Content = base64Data.split(';base64,').pop();
      
      // Converter para blob
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
      
      const blob = new Blob(byteArrays, { type: fileData.type });
      
      // Criar URL do Blob
      const blobUrl = URL.createObjectURL(blob);
      
      // Criar link e acionar download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileData.name;
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
      console.error("Erro ao baixar arquivo:", error);
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
          // Verificar se há dados de arquivo
          let fileData = null;
          if (message.fileData) {
            try {
              fileData = JSON.parse(message.fileData);
              
              // Normaliza URLs de vídeo se necessário
              if (fileData.type.startsWith('video/') && fileData.data) {
                fileData.data = normalizeVideoDataURI(fileData.data, fileData.originalType || fileData.type);
              }
            } catch (e) {
              console.error("Erro ao analisar dados do arquivo:", e);
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
                {/* Renderizar imagem */}
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[300px] max-w-[200px] rounded-md mb-2"
                  />
                )}
                
                {/* Renderizar arquivo armazenado como JSON */}
                {fileData && (
                  <div className="flex items-center gap-2 bg-base-200 p-2 rounded-md mb-2">
                    {fileData.type.startsWith('video/') && (
                      <div className="w-full max-w-[500px]">
                        <div className="video-container relative">
                          {/* Video Player com múltiplas camadas de fallback */}
                          <video 
                            controls 
                            controlsList="nodownload"
                            className="w-full h-auto rounded-md cursor-pointer object-contain"
                            onError={(e) => {
                              console.error("Erro ao carregar vídeo:", e);
                              handleVideoError(message._id);
                            }}
                            // Adicionar poster (imagem de preview) quando disponível
                            poster={fileData.poster || ""}
                            // Tentativa de melhorar o carregamento
                            preload="metadata"
                            playsInline
                          >
                            {/* Tenta com MIME type original */}
                            <source src={fileData.data} type={fileData.type} />
                            
                            {/* Tenta com MP4 */}
                            <source src={fileData.data} type="video/mp4" />
                            
                            {/* Tenta com WebM */}
                            <source src={fileData.data.replace('video/mp4', 'video/webm')} type="video/webm" />
                            
                            {/* Tentativa final com tipo genérico */}
                            <source src={fileData.data} type="video/*" />
                            
                            {/* Mensagem para o usuário */}
                            <p>Seu navegador não suporta reprodução deste vídeo.</p>
                          </video>
                          
                          {/* Overlay de fallback que aparece quando o vídeo falha */}
                          {videoErrors[message._id] && (
                            <div className="absolute inset-0 bg-base-200 rounded-md p-4 flex flex-col items-center justify-center">
                              <div className="flex items-center justify-center bg-base-100 p-6 rounded-lg mb-4">
                                <FileVideo size={48} />
                              </div>
                              <p className="text-center mb-4">
                                <span className="font-medium">Não foi possível reproduzir o vídeo.</span><br />
                                <span className="text-sm opacity-70">Formato não suportado por este navegador.</span>
                              </p>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => downloadFileFromBase64(fileData)}
                                  className="btn btn-sm btn-primary"
                                >
                                  <Download size={16} />
                                  <span>Baixar Vídeo</span>
                                </button>
                                <button
                                  onClick={() => setVideoErrors({...videoErrors, [message._id]: false})}
                                  className="btn btn-sm btn-outline"
                                >
                                  <span>Tentar novamente</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Exibir informações do arquivo de vídeo */}
                        <div className="mt-2 flex items-center justify-between px-2">
                          <div className="flex items-center">
                            <FileVideo size={16} className="mr-2" />
                            <span className="text-xs">{fileData.name}</span>
                          </div>
                          <button
                            onClick={() => downloadFileFromBase64(fileData)}
                            className="btn btn-xs btn-ghost"
                            title="Baixar vídeo"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {!fileData.type.startsWith('video/') && (
                      // Layout existente para outros tipos de arquivo
                      <>
                        <div className="p-2 bg-base-100 rounded-md">
                          {getFileIcon(fileData.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{fileData.name}</p>
                          <p className="text-xs opacity-70">{fileData.size}</p>
                        </div>
                        <button
                          onClick={() => downloadFileFromBase64(fileData)}
                          className="btn btn-sm btn-circle"
                          disabled={downloadingFiles[message._id]}
                        >
                          {downloadingFiles[message._id] ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            <Download size={16} />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                )}
                
                {/* Renderizar texto */}
                {message.text && (
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