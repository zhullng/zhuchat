import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Trash2, MoreVertical, FileText, Download, Pause, Play } from "lucide-react";
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
  const [playingAudio, setPlayingAudio] = useState(null);
  const audioRefs = useRef({});

  // Efeito para carregar mensagens e configurar a subscrição de mensagens
  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    
    // Resetar estado de scroll inicial quando mudar de conversa
    setInitialScrollDone(false);
    setActiveMessageMenu(null);
    
    // Parar qualquer áudio em reprodução ao mudar de conversa
    pauseAllAudio();
    
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

  // Função para baixar um arquivo
  const downloadFile = (fileData, fileName) => {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Função para pausar todos os áudios
  const pauseAllAudio = () => {
    Object.keys(audioRefs.current).forEach(id => {
      if (audioRefs.current[id]) {
        audioRefs.current[id].pause();
      }
    });
    setPlayingAudio(null);
  };
  
  // Função para tocar/pausar áudio
  const toggleAudio = (messageId) => {
    // Se já estiver tocando esse áudio, pause
    if (playingAudio === messageId) {
      audioRefs.current[messageId].pause();
      setPlayingAudio(null);
      return;
    }
    
    // Pause qualquer áudio que esteja tocando
    pauseAllAudio();
    
    // Toque o novo áudio
    if (audioRefs.current[messageId]) {
      audioRefs.current[messageId].play();
      setPlayingAudio(messageId);
      
      // Adicionar evento para resetar quando terminar de tocar
      audioRefs.current[messageId].onended = () => {
        setPlayingAudio(null);
      };
    }
  };
  
  // Formatar tempo de áudio
  const formatAudioTime = (seconds) => {
    if (!seconds && seconds !== 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{message.file.name}</p>
                    <p className="text-xs opacity-70">{message.file.size || ''}</p>
                  </div>
                  <button
                    onClick={() => downloadFile(message.file.data, message.file.name)}
                    className="btn btn-sm btn-circle"
                  >
                    <Download size={16} />
                  </button>
                </div>
              )}
              
              {/* Componente de mensagem de áudio */}
              {message.audio && (
                <div className="flex items-center gap-2 bg-base-200 p-2 rounded-md mb-2 w-full">
                  <button
                    onClick={() => toggleAudio(message._id)}
                    className={`btn btn-sm btn-circle ${playingAudio === message._id ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    {playingAudio === message._id ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="w-full bg-base-300 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-primary ${playingAudio === message._id ? 'animate-progress' : ''}`}
                        style={{
                          width: playingAudio === message._id 
                            ? `${(audioRefs.current[message._id]?.currentTime / audioRefs.current[message._id]?.duration) * 100}%` 
                            : '0%'
                        }}
                      ></div>
                    </div>
                    <audio 
                      ref={el => audioRefs.current[message._id] = el} 
                      src={message.audio.data} 
                      className="hidden"
                      onTimeUpdate={() => {
                        if (playingAudio === message._id) {
                          // Forçar atualização do componente
                          setPlayingAudio(prev => prev);
                        }
                      }}
                    />
                  </div>
                  
                  <span className="text-xs opacity-70">
                    {playingAudio === message._id && audioRefs.current[message._id]
                      ? formatAudioTime(audioRefs.current[message._id].currentTime)
                      : formatAudioTime(message.audio.duration)}
                  </span>
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