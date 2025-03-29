import { useState } from "react";
import { MoreVertical, UserX, UserMinus, Edit } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

// Componente de usuário com menu de opções
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
  viewedConversations = {} // Prop para verificar se já foi visualizada
}) => {
  const { updateContactNote } = useChatStore();
  const [showOptions, setShowOptions] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nickname, setNickname] = useState(user.note || "");
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false);
  
  // Constante para o limite máximo de caracteres
  const MAX_NICKNAME_LENGTH = 45;
  
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
  
  // Abrir modal de edição de nickname
  const openNicknameModal = (e) => {
    e.stopPropagation(); // Evita disparar o onUserClick
    setShowOptions(false);
    setNickname(user.note || ""); // Reiniciar para o valor atual
    setShowNicknameModal(true);
  };
  
  // Fechar modal de edição de nickname
  const closeNicknameModal = (e) => {
    if (e) e.stopPropagation();
    setShowNicknameModal(false);
  };
  
  // Manipular mudança no campo do nickname com limite de caracteres
  const handleNicknameChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_NICKNAME_LENGTH) {
      setNickname(value);
    }
  };
  
  // Atualizar nickname na base de dados
  const handleUpdateNickname = async (e) => {
    e.preventDefault();
    
    // Se o contactId não estiver disponível, não podemos prosseguir
    if (!user.contactId) {
      return;
    }
    
    setIsUpdatingNickname(true);
    
    try {
      await updateContactNote(user.contactId, nickname);
      closeNicknameModal();
    } finally {
      setIsUpdatingNickname(false);
    }
  };
  
  // Verifica se esta conversa já foi visualizada anteriormente
  const isConversationViewed = viewedConversations[user._id] === true;
  
  // Determina se deve mostrar a notificação
  const shouldShowNotification = hasUnread && !isSelected && !isConversationViewed;
  
  // Função para truncar a mensagem com reticências
  const truncateMessage = (text, maxLength = 25) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  
  // Prepara o texto da mensagem com prefixo e truncamento
  const messageText = conv?.latestMessage ? 
    (conv.latestMessage.senderId === authUser?._id ? 'Enviado: ' : '') + 
    (conv.latestMessage.text || (conv.latestMessage.img ? 'Imagem' : 'Mensagem'))
    : '';
  
  const displayMessage = truncateMessage(messageText);
  
  // Nome a ser exibido (nickname ou nome real)
  const displayName = user.note || user.fullName || "Utilizador";
  
  return (
    <div className="relative mb-1">
      <button
        onClick={() => onUserClick(user)}
        className={`
          w-full flex items-center gap-3 p-2 lg:p-3 rounded-lg
          transition-colors hover:bg-base-200
          ${isSelected ? "bg-base-300 ring-1 ring-base-300" : ""} 
        `}
      >
        <div className="relative">
          <img
            src={user.profilePic || "/avatar.png"}
            alt={displayName}
            className="size-10 lg:size-12 object-cover rounded-full border"
          />
          {isOnline && (
            <span className="absolute bottom-0 right-0 size-2.5 lg:size-3 bg-green-500 rounded-full border-2 border-base-100" />
          )}
        </div>

        <div className="flex-1 text-left">
          <div className="flex items-center gap-1">
            {/* Adicionado mr-8 para evitar sobreposição com o botão de três pontos */}
            <span className="font-medium truncate text-sm lg:text-base mr-8">{displayName}</span>
            
            {/* Mostrar nome real em texto pequeno se tiver nickname */}
            {user.note && (
              <span className="text-xs text-base-content/50 truncate hidden sm:inline-block mr-6">
                ({user.fullName})
              </span>
            )}
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
          
          {/* Pré-visualização da última mensagem */}
          <div className="flex items-center justify-between mt-1 max-w-full">
            <div className={`text-xs ${shouldShowNotification ? "font-medium text-base-content" : "text-base-content/70"} truncate flex-grow pr-1`}>
              {displayMessage}
            </div>
          </div>
        </div>
      </button>
      
      {/* Botão de três pontos para menu */}
      <button 
        onClick={toggleOptions}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-base-300 transition-colors z-10"
      >
        <MoreVertical size={16} />
      </button>
      
      {/* Menu de opções */}
      {showOptions && (
        <div className="absolute top-10 right-2 bg-base-100 shadow-lg rounded-md py-1 z-20 w-36 border">
          <button 
            onClick={openNicknameModal}
            className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
          >
            <Edit size={16} />
            Alterar Nickname
          </button>
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
      
      {/* Modal para edição de nickname */}
      {showNicknameModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeNicknameModal}
        >
          <div 
            className="bg-base-100 p-4 rounded-lg w-80 max-w-full"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-3">Alterar Nickname</h3>
            
            <form onSubmit={handleUpdateNickname}>
              <div className="mb-4">
                <label className="block text-sm mb-1">Nickname para {user.fullName}</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={handleNicknameChange}
                  placeholder="Insira um nickname"
                  className="input input-bordered w-full"
                  disabled={isUpdatingNickname}
                  maxLength={MAX_NICKNAME_LENGTH}
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-base-content/60">
                    Deixe em branco para usar o nome original
                  </p>
                  <span className="text-xs text-base-content/60">
                    {nickname.length}/{MAX_NICKNAME_LENGTH}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeNicknameModal}
                  className="btn btn-ghost btn-sm"
                  disabled={isUpdatingNickname}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isUpdatingNickname}
                >
                  {isUpdatingNickname ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserItem;