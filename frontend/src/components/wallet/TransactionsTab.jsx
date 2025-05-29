import React, { useState, useMemo } from 'react';
import { ArrowLeftRight, Search } from 'lucide-react';

const TransactionsTab = ({ transfers, userId, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const getStatusClass = (status) => {
    const baseClasses = "badge badge-sm";
    switch(status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'completed':
        return 'Concluído';
      case 'pending':
        return 'Pendente';
      case 'failed':
        return 'Falha';
      default:
        return 'Desconhecido';
    }
  };

  const renderSkeletons = (count) => {
    return Array(count).fill().map((_, index) => (
      <div key={index} className="flex items-center p-4 border-b border-base-300">
        <div className="skeleton size-10 rounded-full"></div>
        <div className="ml-4 flex-1">
          <div className="skeleton h-4 w-1/2 mb-2"></div>
          <div className="skeleton h-3 w-1/4"></div>
        </div>
        <div className="text-right">
          <div className="skeleton h-5 w-20 mb-2"></div>
          <div className="skeleton h-4 w-16"></div>
        </div>
      </div>
    ));
  };

  // Filtrar transferências baseado no termo de pesquisa
  const filteredTransfers = useMemo(() => {
    if (!transfers || !Array.isArray(transfers)) return [];
    if (!userId) return [];
    
    if (!searchTerm.trim()) return transfers;

    const normalizedSearch = searchTerm.toLowerCase().trim();
    
    return transfers.filter(transfer => {
      // Verificar se sender e receiver existem e têm _id
      if (!transfer || !transfer.sender || !transfer.receiver) {
        return false;
      }
      
      const isSender = transfer.sender && transfer.sender._id === userId;
      
      const personName = isSender 
        ? (transfer.receiver && (transfer.receiver.fullName || transfer.receiver.username || '')).toLowerCase()
        : (transfer.sender && (transfer.sender.fullName || transfer.sender.username || '')).toLowerCase();
        
      return personName.includes(normalizedSearch);
    });
  }, [transfers, searchTerm, userId]);

  const renderTransfers = () => {
    if (isLoading) {
      return renderSkeletons(3);
    }

    if (!transfers || transfers.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <ArrowLeftRight className="size-16 text-gray-300 mb-2" />
          <p className="text-gray-500">Sem transferências para mostrar</p>
        </div>
      );
    }

    if (filteredTransfers.length === 0) {
      if (searchTerm) {
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Search className="size-16 text-gray-300 mb-2" />
            <p className="text-gray-500">Nenhuma transferência encontrada com "{searchTerm}"</p>
          </div>
        );
      }
      
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <ArrowLeftRight className="size-16 text-gray-300 mb-2" />
          <p className="text-gray-500">Sem transferências para mostrar</p>
        </div>
      );
    }

    return filteredTransfers.map((transfer) => {
      // Se não existir sender ou receiver, pular este item
      if (!transfer || !transfer.sender || !transfer.receiver || !transfer._id) {
        return null;
      }
      
      const isSender = transfer.sender._id === userId;
      
      return (
        <div key={transfer._id} className="flex items-center p-4 border-b border-base-300">
          <div className="avatar placeholder">
            <div className={`size-10 rounded-full ${isSender ? 'bg-red-50' : 'bg-green-50'}`}>
              <ArrowLeftRight className={`size-6 ${isSender ? 'text-red-500' : 'text-green-500'}`} />
            </div>
          </div>
          
          <div className="ml-4 flex-1">
            <p className="font-medium">
              {isSender ? 'Para ' : 'De '}
              <strong>
                {isSender 
                  ? (transfer.receiver && (transfer.receiver.fullName || transfer.receiver.username || 'Utilizador'))
                  : (transfer.sender && (transfer.sender.fullName || transfer.sender.username || 'Utilizador'))}
              </strong>
            </p>
            <p className="text-sm text-gray-500">{formatDate(transfer.createdAt)}</p>
          </div>
          
          <div className="text-right">
            <p className={`font-semibold ${isSender ? 'text-red-500' : 'text-green-500'}`}>
              {isSender ? '-' : '+'}{formatCurrency(transfer.amount)}
            </p>
            <div className="flex justify-end mt-1">
              <div className={getStatusClass(transfer.status)}>
                {getStatusText(transfer.status)}
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-4 bg-white rounded-lg p-1">
      {/* Campo de pesquisa */}
      <div className="relative">
        <input
          type="text"
          placeholder="Pesquisar por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input input-bordered w-full pr-10"
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 size-5 text-gray-400" />
      </div>

      {/* Lista de transferências */}
      <div className="max-h-[60vh] overflow-y-auto">
        {renderTransfers()}
      </div>
    </div>
  );
};

export default TransactionsTab;