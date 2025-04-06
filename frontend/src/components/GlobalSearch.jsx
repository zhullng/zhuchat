import React, { useState, useEffect, useCallback } from 'react';
import { X, Search } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

// Componente de resultado de pesquisa
const SearchResult = ({ 
  message, 
  searchTerm, 
  onSelectConversation,
  isSelected 
}) => {
  // Função para destacar o termo de pesquisa no texto
  const highlightText = (text, term) => {
    if (!term) return text;
    
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === term.toLowerCase() ? 
      <mark key={index} className="bg-yellow-200">{part}</mark> : 
      part
    );
  };

  return (
    <div 
      onClick={() => onSelectConversation(message)}
      className={`p-2 hover:bg-base-200 cursor-pointer ${isSelected ? 'bg-base-200' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <img 
          src={message.senderProfilePic || "/avatar.png"} 
          alt="Profile" 
          className="w-8 h-8 rounded-full"
        />
        <div className="flex-1">
          <div className="font-medium text-sm">
            {message.senderName}
          </div>
          <div className="text-xs text-base-content/70">
            {new Date(message.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
      <div className="text-sm">
        {highlightText(message.text, searchTerm)}
      </div>
    </div>
  );
};

// Hook personalizado para pesquisa global
const useGlobalSearch = (searchTerm) => {
  const { conversations, messages } = useChatStore();
  const { authUser } = useAuthStore();
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }

    // Pesquisa em todas as conversas e mensagens
    const globalResults = messages.filter(message => 
      message.text && 
      message.text.toLowerCase().includes(searchTerm.toLowerCase())
    ).map(message => ({
      ...message,
      senderName: message.senderId === authUser._id ? 
        authUser.fullName : 
        conversations.find(conv => 
          conv.participants.includes(message.senderId)
        )?.otherUserName || 'Utilizador',
      senderProfilePic: message.senderId === authUser._id ? 
        authUser.profilePic : 
        conversations.find(conv => 
          conv.participants.includes(message.senderId)
        )?.otherUserProfilePic
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setSearchResults(globalResults);
  }, [searchTerm, messages, conversations, authUser]);

  return searchResults;
};

// Componente de pesquisa global
export const GlobalSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const { setSelectedUser, getMessages } = useChatStore();

  const searchResults = useGlobalSearch(searchTerm);

      const handleSelectConversation = (message) => {
    const otherUserId = message.senderId === useAuthStore.getState().authUser._id 
      ? message.receiverId 
      : message.senderId;
    
    const selectedUserData = {
      _id: otherUserId,
      fullName: message.senderName
    };

    // Primeiro, seleciona o usuário e carrega as mensagens
    setSelectedUser(selectedUserData);
    getMessages(otherUserId);
    setSelectedResult(message);

    // Depois, destaca a mensagem (precisa ser feito após carregar as mensagens)
    setTimeout(() => {
      if (window.highlightAndScrollToMessage) {
        window.highlightAndScrollToMessage(message._id);
      }
    }, 300);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedResult(null);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <input 
          type="text" 
          placeholder="Pesquisar mensagens..." 
          className="input input-sm input-bordered w-full pr-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm ? (
          <button 
            onClick={clearSearch}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500"
            title="Limpar pesquisa"
          >
            <X size={16} />
          </button>
        ) : (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            <Search size={16} />
          </div>
        )}
      </div>

      {searchTerm && searchResults.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-base-100 border border-base-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
          {searchResults.map((result, index) => (
            <SearchResult 
              key={result._id} 
              message={result}
              searchTerm={searchTerm}
              onSelectConversation={handleSelectConversation}
              isSelected={selectedResult?._id === result._id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;