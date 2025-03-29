import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import { Trash2, MoreVertical, UserX, UserMinus } from "lucide-react";

// Componente de usuário com swipe e menu de opções
const UserItem = ({ user, onUserClick, isSelected, hasUnread, unreadCount, conv, isOnline, authUser, onRemove, onBlock }) => {
  // Verifica se é um dispositivo móvel
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const [showOptions, setShowOptions] = useState(false);
  
  // Função para lidar com a remoção de contato
  const handleRemoveContact = (e) => {
    e.stopPropagation(); // Evita disparar o onUserClick
    setShowOptions(false);
    
    if (window.confirm(`Tem certeza que deseja remover ${user.fullName || "este contacto"}?`)) {
      onRemove(user._id);
    }
  };
  
  // Função para lidar com o bloqueio do utilizador
  const handleBlockUser = (e) => {
    e.stopPropagation(); // Evita disparar o onUserClick
    setShowOptions(false);
    
    if (window.confirm(`Tem certeza que deseja bloquear ${user.fullName || "este utilizador"}?`)) {
      onBlock(user._id);
    }
  };
  
  // Alternar menu de opções
  const toggleOptions = (e) => {
    e.stopPropagation(); // Evita disparar o onUserClick
    setShowOptions(!showOptions);
  };
  
  // Configuração do swipe
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const element = document.getElementById(`user-item-${user._id}`);
      const deleteBtn = document.getElementById(`delete-btn-${user._id}`);
      if (element && deleteBtn) {
        element.style.transform = 'translateX(-80px)';
        deleteBtn.style.opacity = '1';
      }
    },
    onSwipedRight: () => {
      const element = document.getElementById(`user-item-${user._id}`);
      const deleteBtn = document.getElementById(`delete-btn-${user._id}`);
      if (element && deleteBtn) {
        element.style.transform = 'translateX(0)';
        deleteBtn.style.opacity = '0';
      }
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: false
  });
  
  // Se não for um dispositivo touch, não aplicamos os handlers de swipe
  const handlers = isTouchDevice ? swipeHandlers : {};
  
  return (
    <div className="relative overflow-hidden mb-1">
      <div 
        {...handlers}
        className="relative"
      >
        <div 
          id={`user-item-${user._id}`}
          className="transition-transform duration-200 ease-out"
        >
          <div className="relative">
            <button
              onClick={() => onUserClick(user)}
              className={`
                w-full flex items-center gap-3 p-2 lg:p-3 rounded-lg
                transition-colors hover:bg-base-200
                ${isSelected ? "bg-base-300 ring-1 ring-base-300" : ""} 
                ${hasUnread ? "bg-primary/10" : ""}
              `}
            >
              <div className="relative">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName || "Utilizador"}
                  className="size-10 lg:size-12 object-cover rounded-full border"
                />
                {isOnline && (
                  <span className="absolute bottom-0 right-0 size-2.5 lg:size-3 bg-green-500 rounded-full border-2 border-base-100" />
                )}
              </div>
  
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate text-sm lg:text-base mr-6">{user.fullName || "Utilizador"}</span>
                  {/* Note que adicionamos mr-6 acima para dar espaço ao botão de opções */}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${isOnline ? "text-green-500" : "text-base-content/60"}`}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                  
                  {/* Horário da última mensagem, se existir */}
                  {conv?.latestMessage && (
                    <span className="text-xs text-base-content/60">
                      {new Date(conv.latestMessage.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
                
                {/* Pré-visualização da última mensagem ou notificação */}
                <div className="flex items-center justify-between mt-1 max-w-full">
                  {/* Texto da última mensagem */}
                  <div className={`text-xs ${hasUnread ? "font-medium text-base-content" : "text-base-content/70"} truncate flex-grow`}>
                    {conv?.latestMessage ? (
                      <>
                        {conv.latestMessage.senderId === authUser?._id ? 'Você: ' : ''}
                        {conv.latestMessage.text || (conv.latestMessage.img ? 'Imagem' : 'Mensagem')}
                      </>
                    ) : ''}
                  </div>
                  
                  {/* Indicador de nova mensagem - separado da mensagem */}
                  {hasUnread && (
                    <span className="inline-flex items-center justify-center bg-primary text-primary-content rounded-lg px-2 py-0.5 text-xs font-medium ml-1">
                      Nova Mensagem
                    </span>
                  )}
                </div>
              </div>
            </button>
            
            {/* Botão de três pontos para menu - Agora com z-index para ficar sempre visível */}
            <button 
              onClick={toggleOptions}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-base-300 transition-colors z-10"
            >
              <MoreVertical size={16} />
            </button>
            
            {/* Menu de opções - mostrado quando os três pontos são clicados */}
            {showOptions && (
              <div className="absolute top-10 right-2 bg-base-100 shadow-lg rounded-md py-1 z-20 w-36 border">
                <button 
                  onClick={handleRemoveContact}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
                >
                  <UserMinus size={16} />
                  Remover
                </button>
                <button 
                  onClick={handleBlockUser}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
                >
                  <UserX size={16} />
                  Bloquear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Botão de excluir que aparece ao deslizar - inicialmente oculto */}
      <button
        id={`delete-btn-${user._id}`}
        onClick={handleRemoveContact}
        className="absolute top-0 right-0 h-full w-[80px] bg-red-500 text-white flex items-center justify-center opacity-0 transition-opacity duration-200"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
};

export default UserItem;