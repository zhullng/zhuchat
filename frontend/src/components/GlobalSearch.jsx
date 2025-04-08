import React, { useState } from 'react';
import { X, Search } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";

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
      <span key={index} className="bg-yellow-200 text-gray-800 px-0.5 rounded">{part}</span> : 
      part
    );
  };

  // Determinar o nome do remetente
  const getSenderName = () => {
    if (typeof message.senderId === 'object' && message.senderId !== null && message.senderId.fullName) {
      return message.senderId.fullName;
    }
    return 'Membro do grupo';
  };

  return (
    <div 
      onClick={() => onSelectMessage(message)}
      className={`p-2 hover:bg-base-200 cursor-pointer ${isSelected ? 'bg-base-200' : ''}`}
    >
      <div className="text-xs text-base-content/70 mb-1">
        {getSenderName()}
      </div>
      <div className="text-sm break-words">
        {highlightText(message.text, searchTerm)}
      </div>
      <div className="text-xs text-base-content/70 mt-1">
        {new Date(message.createdAt).toLocaleString()}
      </div>
    </div>
  );
};

// Componente de pesquisa global para grupos
const GroupGlobalSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const { groupMessages, selectedGroup } = useGroupStore();

  // Filtrar mensagens apenas do grupo selecionado e que contêm o termo de busca
  const searchResults = groupMessages.filter(message => 
    message.text && 
    message.text.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const handleSelectMessage = (message) => {
    setSelectedResult(message);

    // Função para destacar e rolar para a mensagem
    setTimeout(() => {
      const messageElement = document.getElementById(`group-message-${message._id}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Adicionar classe para destacar temporariamente
        messageElement.classList.add('bg-base-200');
        setTimeout(() => {
          messageElement.classList.remove('bg-base-200');
        }, 2000);
        
        // Adicionar uma borda temporária para destacar a mensagem
        const originalBorder = messageElement.style.border;
        messageElement.style.border = '2px solid var(--p)';
        setTimeout(() => {
          messageElement.style.border = originalBorder;
        }, 2000);
      }
    }, 100);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedResult(null);
  };

  return (
    <div className="relative w-full">
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
        <div className="absolute z-10 mt-1 w-full max-w-[calc(100vw-1rem)] bg-base-100 border border-base-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
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

export default GroupGlobalSearch;