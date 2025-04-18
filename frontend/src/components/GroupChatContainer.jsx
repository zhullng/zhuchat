// components/GroupChatContainer.jsx
import { useEffect, useRef, useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import GroupChatHeader from "./GroupChatHeader";
import GroupMessageInput from "./GroupMessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { Trash2, MoreVertical, Users } from "lucide-react";
import { formatMessageTime } from "../lib/utils";
import toast from "react-hot-toast";
import { isSocketHealthy } from "../services/socket";

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
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2"
                  />
                )}
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