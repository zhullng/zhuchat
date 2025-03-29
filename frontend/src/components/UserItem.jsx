import { useState, useRef, useEffect } from "react";
import { MoreVertical, UserMinus, UserX } from "lucide-react";
import toast from "react-hot-toast";

const UserItem = ({ 
  user, 
  onUserClick, 
  isSelected, 
  hasUnread, 
  unreadCount, 
  conv, 
  isOnline,
  authUser,
  onRemove,
  onBlock,
  viewedConversations
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef(null);

  // Fechar menu de opções quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Função para tratar remoção de contato
  const handleRemoveContact = (e) => {
    e.stopPropagation();
    setShowOptions(false);
    
    // Confirmar antes de remover
    if (window.confirm(`Tem certeza que deseja remover ${user.fullName} dos seus contactos?`)) {
      onRemove && onRemove(user._id);
    }
  };
  
  // Função para tratar bloqueio de usuário
  const handleBlockUser = (e) => {
    e.stopPropagation();
    setShowOptions(false);
    
    // Confirmar antes de bloquear
    if (window.confirm(`Tem certeza que deseja bloquear ${user.fullName}? Este utilizador não poderá enviar-lhe mensagens.`)) {
      onBlock && onBlock(user._id);
    }
  };

  // Obter informações da última mensagem
  const lastMessage = conv?.latestMessage;
  const isLastMessageFromMe = lastMessage && lastMessage.senderId === authUser?._id;
  
  return (
    <div 
      className={`
        relative w-full flex items-center gap-3 p-2 lg:p-3 rounded-lg cursor-pointer
        transition-colors mb-1
        ${isSelected ? "bg-base-300 ring-1 ring-base-300" : "hover:bg-base-200"} 
        ${hasUnread ? "bg-primary bg-opacity-5" : ""}
      `}
      onClick={() => onUserClick(user)}
    >
      {/* Avatar com indicador de status */}
      <div className="relative">
        <img 
          src={user.profilePic || "/avatar.png"} 
          alt={user.fullName}
          className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover"
        />
        
        {isOnline && (
          <span className="absolute bottom-0 right-0 size-2.5 lg:size-3 bg-green-500 rounded-full border-2 border-base-100" />
        )}
      </div>

      {/* Informações do usuário */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate text-sm lg:text-base">
          {user.note || user.fullName}
        </div>
        
        {/* Email ou última mensagem */}
        <div className="text-xs text-base-content/70 truncate">
          {lastMessage ? (
            <span className="flex items-center">
              {isLastMessageFromMe && <span className="mr-1 text-xs">Você: </span>}
              {lastMessage.text || (lastMessage.file ? "📎 Anexo" : lastMessage.image ? "📷 Imagem" : "")}
            </span>
          ) : (
            user.email
          )}
        </div>
      </div>

      {/* Indicador de mensagens não lidas */}
      {unreadCount > 0 && (
        <div className="flex-shrink-0 bg-primary text-white size-5 lg:size-6 rounded-full flex items-center justify-center text-xs font-medium">
          {unreadCount}
        </div>
      )}

      {/* Botão de opções */}
      <button
        className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          setShowOptions(!showOptions);
        }}
      >
        <MoreVertical className="size-4 lg:size-5 text-base-content/50 hover:text-base-content" />
      </button>

      {/* Menu de opções */}
      {showOptions && (
        <div 
          ref={optionsRef}
          className="absolute right-0 top-full mt-1 z-10 bg-base-100 shadow-lg rounded-lg p-1 border border-base-300"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex items-center gap-2 p-2 hover:bg-base-200 w-full rounded-md text-sm"
            onClick={handleRemoveContact}
          >
            <UserMinus className="size-4" />
            <span>Remover contacto</span>
          </button>
          
          <button
            className="flex items-center gap-2 p-2 hover:bg-error hover:bg-opacity-10 w-full rounded-md text-error text-sm"
            onClick={handleBlockUser}
          >
            <UserX className="size-4" />
            <span>Bloquear utilizador</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserItem;