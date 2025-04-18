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
  
  // Registra função global para download de fallback
  useEffect(() => {
    window.downloadVideoFallback = (messageId) => {
      const message = groupMessages.find(m => m._id === messageId);
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
  }, [groupMessages]);

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
              <>    <span className="font-semibold text-sm">
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
        {fileData && (
          <div className="flex items-center gap-2 bg-base-200 p-2 rounded-md mb-2">
            {fileData.type.startsWith('video/') && (
              <div className="w-full max-w-[500px]">
                {videoErrors[message._id] ? (
                  <VideoFallback 
                    fileData={fileData} 
                    onDownload={() => downloadFileFromBase64(fileData)}
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
                    >
                      {/* Use múltiplas fontes para melhorar compatibilidade */}
                      <source src={fileData.data} type="video/mp4" />
                      <source src={fileData.data} type="video/quicktime" />
                      <source src={fileData.data} type="video/webm" />
                      {/* Adicione uma mensagem para feedback */}
                      Seu navegador não suporta reprodução deste vídeo.
                    </video>
                  </div>
                )}
                
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
                  {fileData.size && <p className="text-xs opacity-70">{fileData.size}</p>}
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
</div>);
};
export default GroupChatContainer;