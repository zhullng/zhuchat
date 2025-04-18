// components/GroupChatContainer.jsx
import { useEffect, useRef, useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import GroupChatHeader from "./GroupChatHeader";
import GroupMessageInput from "./GroupMessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { Trash2, MoreVertical, Users, FileText, FileVideo, Image, File, Download, FileAudio, FileBadge } from "lucide-react";
import { formatMessageTime, normalizeVideoDataURI } from "../lib/utils";
import toast from "react-hot-toast";
import { isSocketHealthy } from "../services/socket";

// Componente de fallback para vídeos que não reproduzem
const VideoFallback = ({ fileData, onDownload, onRetry }) => {
  return (
    <div className="flex flex-col items-center gap-3 p-4 border border-base-300 rounded-lg bg-base-200">
      <div className="flex items-center justify-center bg-base-100 p-6 rounded-lg">
        <FileVideo size={48} />
      </div>
      <p className="text-center">
        <span className="font-medium">Não foi possível reproduzir o vídeo.</span><br />
        <span className="text-sm opacity-70">Formato não suportado por este navegador.</span>
      </p>
      <div className="flex gap-2">
        <button 
          onClick={onDownload}
          className="btn btn-sm btn-primary"
        >
          <Download size={16} />
          <span>Baixar Vídeo</span>
        </button>
        <button 
          onClick={onRetry}
          className="btn btn-sm btn-outline"
        >
          <span>Tentar novamente</span>
        </button>
      </div>
    </div>
  );
};

const GroupChatContainer = ({ isMobile = false, onBack }) => {
  const {
    groupMessages,
    isGroupMessagesLoading,
    selectedGroup,
    getGroupMessages,
    markGroupAsRead,
    deleteGroupMessage,
    subscribeToGroupEvents
  } = useGroupStore();
  const { authUser, socket, checkSocketHealth } = useAuthStore();
  const messageEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [downloadingFiles, setDownloadingFiles] = useState({});
  const [videoErrors, setVideoErrors] = useState({});

  // Verificar saúde do socket ao iniciar
  useEffect(() => {
    if (!isSocketHealthy() && selectedGroup) {
      console.log("Socket não está saudável no chat de grupo, tentando reconectar...");
      checkSocketHealth();
    }
  }, [selectedGroup, checkSocketHealth]);

  // Garantir que estamos inscritos nos eventos do grupo
  useEffect(() => {
    if (selectedGroup) {
      console.log("Verificando eventos de grupo...");
      subscribeToGroupEvents();
      
      // Tentar entrar na sala específica do grupo
      if (socket && socket.connected) {
        console.log("Entrando na sala do grupo via effect:", selectedGroup._id);
        socket.emit("joinGroup", selectedGroup._id);
        
        // Verificar se conseguimos entrar
        setTimeout(() => {
          socket.emit("checkConnection");
        }, 1000);
      }
    }
  }, [selectedGroup, socket, subscribeToGroupEvents]);

  // Efeito para carregar mensagens
  useEffect(() => {
    if (selectedGroup?._id) {
      getGroupMessages(selectedGroup._id);
      markGroupAsRead(selectedGroup._id);
      
      // Resetar estado de scroll inicial
      setInitialScrollDone(false);
      setActiveMessageMenu(null);
      setVideoErrors({});
    }
  }, [selectedGroup?._id, getGroupMessages, markGroupAsRead]);

  // Efeito para scroll automático quando as mensagens iniciais são carregadas
  useEffect(() => {
    if (!isGroupMessagesLoading && groupMessages.length > 0 && !initialScrollDone) {
      setTimeout(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: "auto" });
          setInitialScrollDone(true);
        }
      }, 100);
    }
  }, [groupMessages, isGroupMessagesLoading, initialScrollDone]);

  // Efeito para scroll em novas mensagens
  useEffect(() => {
    if (initialScrollDone && messageEndRef.current && groupMessages.length > 0) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [groupMessages.length, initialScrollDone]);

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

  // Função para excluir mensagem
  const handleDeleteMessage = async (messageId) => {
    try {
      // Mostrar toast de carregamento
      const loadingToast = toast.loading("Eliminando mensagem...");
      
      // Chamar a função do store para eliminar a mensagem
      await deleteGroupMessage(messageId);
      
      // Fechar o menu de opções
      setActiveMessageMenu(null);
      
      // Dismissar o toast de carregamento
      toast.dismiss(loadingToast);
    } catch (error) {
      console.error("Erro ao eliminar mensagem:", error);
      toast.error("Erro ao eliminar mensagem");
    }
  };

  // Função para determinar ícone apropriado para o tipo de arquivo
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

  // Função para lidar com erros de vídeo
  const handleVideoError = (messageId) => {
    setVideoErrors(prev => ({
      ...prev,
      [messageId]: true
    }));
  };

  // Função para tentar reproduzir o vídeo novamente
  const handleRetryVideo = (messageId) => {
    setVideoErrors(prev => ({
      ...prev,
      [messageId]: false
    }));
  };

  // Função simplificada para abrir/baixar qualquer tipo de arquivo
  const handleFileDownload = (file, messageId) => {
    // Log detalhado para debug
    console.log("Tentando baixar arquivo:", { 
      name: file.name, 
      type: file.type, 
      url: file.url 
    });
    
    // Atualizar estado
    setDownloadingFiles(prev => ({ ...prev, [messageId]: true }));
    
    // Mostrar toast de progresso
    const toastId = toast.loading("Preparando arquivo...");
    
    // Abrir em nova aba (método mais confiável)
    window.open(file.url, '_blank');
    
    // Atualizar toast e estado após um curto período
    setTimeout(() => {
      toast.success("Arquivo aberto em nova aba", { id: toastId });
      setDownloadingFiles(prev => ({ ...prev, [messageId]: false }));
    }, 1000);
  };

  // Função auxiliar para obter extensão de arquivo
  const getFileExtension = (mimeType) => {
    if (!mimeType) return '';
    
    const mappings = {
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'text/plain': '.txt'
    };
    
    return mappings[mimeType] || '';
  };

  // Registrar a função global para destacar mensagens na pesquisa
  useEffect(() => {
    window.highlightAndScrollToGroupMessage = (messageId) => {
      setHighlightedMessageId(messageId);
      
      setTimeout(() => {
        const messageElement = document.getElementById(`group-message-${messageId}`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Adicionar destaque visual temporário
          messageElement.style.backgroundColor = 'rgba(var(--p), 0.1)';
          
          setTimeout(() => {
            messageElement.style.backgroundColor = '';
            setHighlightedMessageId(null);
          }, 2000);
        }
      }, 100);
    };
    
    return () => {
      delete window.highlightAndScrollToGroupMessage;
    };
  }, []);

  if (isGroupMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <GroupChatHeader isMobile={isMobile} onBack={onBack} />
        <MessageSkeleton />
        <GroupMessageInput />
      </div>
    );
  }

  return (
    <div className="h-screen supports-[height:100cqh]:h-[100cqh] supports-[height:100svh]:h-[100svh] flex-1 flex flex-col overflow-auto pb-5">
      <GroupChatHeader isMobile={isMobile} onBack={onBack} />
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-100"
      >
        {groupMessages.map((message) => {
          // Validação robusta para verificar se message.senderId é um objeto ou string
          let senderId, isMyMessage, senderName, senderPic;
          
          // Determinar o ID do remetente independente do formato
          if (typeof message.senderId === 'object' && message.senderId !== null) {
            senderId = message.senderId._id;
          } else {
            senderId = message.senderId;
          }
          
          // Verificar se a mensagem é do usuário atual
          isMyMessage = senderId === authUser._id;
          
          // Determinar nome do remetente
          if (isMyMessage) {
            // Se for minha mensagem, uso meu nome
            senderName = authUser.fullName || 'Você';
            senderPic = authUser.profilePic || '/avatar.png';
          } else if (typeof message.senderId === 'object' && message.senderId !== null && message.senderId.fullName) {
            // Se for objeto de outro usuário com nome, uso os dados fornecidos
            senderName = message.senderId.fullName;
            senderPic = message.senderId.profilePic || '/avatar.png';
          } else {
            // Se for string de ID ou objeto sem nome, tento encontrar o membro no grupo
            const sender = selectedGroup?.members?.find(member => member._id === senderId);
            if (sender) {
              senderName = sender.fullName || 'Membro do grupo';
              senderPic = sender.profilePic || '/avatar.png';
            } else {
              senderName = 'Membro do grupo';
              senderPic = '/avatar.png';
            }
          }
          
          // Verificar se esta mensagem está destacada
          const isHighlighted = message._id === highlightedMessageId;
          
          // Verificar se é uma mensagem temporária
          const isTemporary = message._id && String(message._id).startsWith('temp-');
          
          return (
            <div
              key={message._id}
              id={`group-message-${message._id}`}
              className={`chat ${isMyMessage ? "chat-end" : "chat-start"} ${
                isHighlighted ? "bg-base-200 rounded-lg transition-colors duration-500" : ""
              } ${isTemporary ? "opacity-70" : ""}`}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={senderPic}
                    alt="profile pic"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className={`chat-header mb-1 flex items-center ${isMyMessage ? "justify-end" : "justify-start"}`}>
                {isMyMessage ? (
                  <>
                    <time className="text-xs opacity-50">
                      {formatMessageTime(message.createdAt)}
                      {isTemporary && " (enviando...)"}
                    </time>
                    <span className="font-semibold text-sm ml-2 flex items-center">
                      {senderName}
                      
                      {/* Opções de mensagem - apenas para mensagens próprias não temporárias */}
                      {!isTemporary && (
                        <div className="message-menu-container ml-1 relative">
                          <button 
                            onClick={() => setActiveMessageMenu(activeMessageMenu === message._id ? null : message._id)} 
                            className="p-1 rounded-full hover:bg-base-300 transition-colors"
                          >
                            <MoreVertical size={14} />
                          </button>
                          
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
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-sm">
                      {senderName}
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
                    alt="Imagem anexada"
                    className="sm:max-w-[300px] max-w-[200px] rounded-md mb-2"
                  />
                )}
                
                {/* Renderizar vídeo ou outro tipo de arquivo */}
                {message.file && (
                  <div className="flex items-center gap-2 bg-base-200 p-2 rounded-md mb-2">
                    {message.file.type && message.file.type.startsWith('video/') ? (
                      <div className="w-full max-w-[500px]">
                        {videoErrors[message._id] ? (
                          <VideoFallback 
                            fileData={message.file} 
                            onDownload={() => handleFileDownload(message.file, message._id)}
                            onRetry={() => handleRetryVideo(message._id)}
                          />
                        ) : (
                          <div className="video-container relative">
                            {/* Player de vídeo com melhor compatibilidade */}
                            <video 
                              controls 
                              controlsList="nodownload"
                              className="w-full h-auto rounded-md cursor-pointer object-contain"
                              onError={(e) => {
                                console.error("Erro ao carregar vídeo:", e);
                                handleVideoError(message._id);
                              }}
                              preload="metadata"
                              playsInline
                              src={message.file.url}
                            >
                              <source src={message.file.url} type={message.file.type} />
                              <source src={message.file.url} type="video/mp4" />
                              <source src={message.file.url} type="video/quicktime" />
                              <source src={message.file.url} type="video/webm" />
                              Seu navegador não suporta reprodução deste vídeo.
                            </video>
                          </div>
                        )}
                        
                        {/* Exibir informações do arquivo de vídeo */}
                        <div className="mt-2 flex items-center justify-between px-2">
                          <div className="flex items-center">
                            <FileVideo size={16} className="mr-2" />
                            <span className="text-xs">{message.file.name}</span>
                          </div>
                          <button
                            onClick={() => handleFileDownload(message.file, message._id)}
                            className="btn btn-xs btn-ghost"
                            title="Abrir vídeo"
                            disabled={downloadingFiles[message._id]}
                          >
                            {downloadingFiles[message._id] ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              <Download size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Layout existente para outros tipos de arquivo
                      <>
                        <div className="p-2 bg-base-100 rounded-md">
                          {getFileIcon(message.file.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{message.file.name}</p>
                          <p className="text-xs opacity-70">{message.file.size}</p>
                        </div>
                        <button
                          onClick={() => handleFileDownload(message.file, message._id)}
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
                
                {/* Renderizar texto da mensagem */}
                {message.text && (
                  <p className="break-words whitespace-pre-wrap">{message.text}</p>
                )}
              </div>
            </div>
          );
        })}
        
        {groupMessages.length === 0 && (
          <div className="flex items-center justify-center h-full text-base-content/60">
            <div className="text-center">
              <div className="mb-2">
                <Users size={48} className="mx-auto opacity-40" />
              </div>
              <p>Sem mensagens neste grupo</p>
              <p className="text-sm mt-1">Seja o primeiro a enviar uma mensagem!</p>
            </div>
          </div>
        )}
        
        {/* Referência para o final da lista de mensagens */}
        <div ref={messageEndRef} id="message-end-ref"></div>
      </div>
      <GroupMessageInput />
    </div>
  );
};

export default GroupChatContainer;