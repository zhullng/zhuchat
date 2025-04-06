import React, { useState, useEffect, useCallback } from 'react';
import { X, Search } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

// Componente de resultado de pesquisa
const SearchResult = ({ 
  message, 
  searchTerm, 
  onSelectMessage,
  isSelected 
}) => {
  // Função para destacar o termo de pesquisa no texto
  const highlightText = (text, term) => {
    if (!term) return text;
    
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase().includes(term.toLowerCase()) ? 
      <mark key={index} className="bg-yellow-200">{part}</mark> : 
      part
    );
  };

  return (
    <div 
      onClick={() => onSelectMessage(message)}
      className={`p-2 hover:bg-base-200 cursor-pointer ${isSelected ? 'bg-base-200' : ''}`}
    >
      <div className="text-sm break-words">
        {highlightText(message.text, searchTerm)}
      </div>
      <div className="text-xs text-base-content/70 mt-1">
        {new Date(message.createdAt).toLocaleString()}
      </div>
    </div>
  );
};

// Componente de pesquisa global
export const GlobalSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const { messages } = useChatStore();
  const { selectedUser } = useChatStore();

  // Filtrar mensagens apenas do usuário selecionado e que contêm o termo de busca
  const searchResults = messages.filter(message => 
    message.text && 
    (message.senderId === selectedUser._id || message.receiverId === selectedUser._id) &&
    message.text.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const handleSelectMessage = (message) => {
    setSelectedResult(message);

    // Usar a função global para destacar e rolar para a mensagem
    if (window.highlightAndScrollToMessage) {
      window.highlightAndScrollToMessage(message._id);
    }
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
          <div className="text-xs p-2 text-base-content/70">
            {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
          </div>
          {searchResults.map((result) => (
            <SearchResult 
              key={result._id} 
              message={result}
              searchTerm={searchTerm}
              onSelectMessage={handleSelectMessage}
              isSelected={selectedResult?._id === result._id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;