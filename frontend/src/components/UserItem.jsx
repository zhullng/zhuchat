import { useState } from "react";
import { MoreVertical, UserX, UserMinus } from "lucide-react";

// Componente de usuário com menu de opções (sem swipe)
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
  viewedConversations = {} // Nova prop para verificar se já foi visualizada, com valor padrão
}) => {
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
  
  // Verifica se esta conversa já foi visualizada anteriormente
  const isConversationViewed = viewedConversations[user._id] === true;
  
  // Determina se deve mostrar a notificação "Nova Mensagem"
  // Só mostra se houver mensagens não lidas E não estiver selecionado E não tiver sido visualizada
  const shouldShowNotification = hasUnread && !isSelected && !isConversationViewed;
  
  return (
    <div className="relative mb-1">
      <button
        onClick={() => onUserClick(user)}
        className={`
          w-full flex items-center gap-3 p-2 lg:p-3 rounded-lg
          transition-colors hover:bg-base-200
          ${isSelected ? "bg-base-300 ring-1 ring-base-300" : ""} 
          ${shouldShowNotification ? "bg-primary/10" : ""}
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
            <div className={`text-xs ${shouldShowNotification ? "font-medium text-base-content" : "text-base-content/70"} truncate flex-grow`}>
              {conv?.latestMessage ? (
                <>
                  {conv.latestMessage.senderId === authUser?._id ? 'Enviado: ' : ''}
                  {conv.latestMessage.text || (conv.latestMessage.img ? 'Imagem' : 'Mensagem')}
                </>
              ) : ''}
            </div>
            
            {/* Indicador de nova mensagem - separado da mensagem - APENAS se não estiver visualizada */}
            {shouldShowNotification && (
              <span className="inline-flex items-center justify-center bg-primary text-primary-content rounded-lg px-2 py-0.5 text-xs font-medium ml-1">
                Nova Mensagem
              </span>
            )}
          </div>
        </div>
      </button>
      
      {/* Botão de três pontos para menu - Com z-index para ficar sempre visível */}
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
  );
};

export default UserItem;