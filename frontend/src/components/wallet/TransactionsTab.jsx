import React, { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Receipt, CreditCard, Building, Wallet, AlertCircle } from 'lucide-react';

const TransactionsTab = ({ transactions, transfers, userId, isLoading }) => {
  const [activeSubTab, setActiveSubTab] = useState(0);

  // Debug para verificar os dados recebidos
  useEffect(() => {
    console.log('TransactionsTab - Props:', {
      transactionsCount: transactions?.length,
      transfersCount: transfers?.length,
      userId,
      isLoading
    });
  }, [transactions, transfers, userId, isLoading]);

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

  const getMethodIcon = (method) => {
    switch(method) {
      case 'card':
        return <CreditCard className="size-4" />;
      case 'bank_transfer':
        return <Building className="size-4" />;
      default:
        return <Wallet className="size-4" />;
    }
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

  const renderTransactions = () => {
    if (isLoading) {
      return renderSkeletons(3);
    }

    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    console.log('Rendering transactions:', safeTransactions.length);

    if (safeTransactions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Receipt className="size-16 text-gray-300 mb-2" />
          <p className="text-gray-500">Sem transações para mostrar</p>
        </div>
      );
    }

    return safeTransactions.map((transaction) => (
      <div key={transaction._id} className="flex items-center p-4 border-b border-base-300">
        <div className="avatar placeholder">
          <div className={`size-10 rounded-full ${transaction.type === 'deposit' ? 'bg-green-50' : 'bg-red-50'}`}>
            {transaction.type === 'deposit' ? (
              <ArrowDownCircle className="size-6 text-green-500" />
            ) : (
              <ArrowUpCircle className="size-6 text-red-500" />
            )}
          </div>
        </div>
        
        <div className="ml-4 flex-1">
          <p className="font-medium line-clamp-1">
            {transaction.type === 'deposit' ? 'Depósito' : 'Levantamento'} via {
              transaction.method === 'card' ? 'Cartão' :
              transaction.method === 'bank_transfer' ? 'Transferência Bancária' : 
              'Método Desconhecido'
            }
            {transaction.details?.cardLast4 && ` **** ${transaction.details.cardLast4}`}
          </p>
          <p className="text-sm text-gray-500">{formatDate(transaction.createdAt)}</p>
        </div>
        
        <div className="text-right">
          <p className={`font-semibold ${transaction.type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>
            {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
          </p>
          <div className="flex justify-end mt-1">
            <div className={getStatusClass(transaction.status)}>
              {getMethodIcon(transaction.method)}
              <span className="ml-1">{getStatusText(transaction.status)}</span>
            </div>
          </div>
        </div>
      </div>
    ));
  };

  const renderTransfers = () => {
    if (isLoading) {
      return renderSkeletons(3);
    }

    const safeTransfers = Array.isArray(transfers) ? transfers : [];
    console.log('Rendering transfers:', safeTransfers.length);

    if (safeTransfers.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <ArrowLeftRight className="size-16 text-gray-300 mb-2" />
          <p className="text-gray-500">Sem transferências para mostrar</p>
        </div>
      );
    }

    return safeTransfers.map((transfer) => {
      const isSender = transfer.sender._id === userId;
      
      return (
        <div key={transfer._id} className="flex items-center p-4 border-b border-base-300">
          <div className="avatar placeholder">
            <div className={`size-10 rounded-full ${isSender ? 'bg-red-50' : 'bg-green-50'}`}>
              <ArrowLeftRight className={`size-6 ${isSender ? 'text-red-500' : 'text-green-500'}`} />
            </div>
          </div>
          
          <div className="ml-4 flex-1">
            <p className="font-medium line-clamp-1">
              {isSender ? 'Transferência para ' : 'Recebido de '}
              <strong>
                {isSender ? transfer.receiver.fullName || transfer.receiver.username : transfer.sender.fullName || transfer.sender.username}
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

  const renderAllItems = () => {
    if (isLoading) {
      return renderSkeletons(5);
    }

    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    const safeTransfers = Array.isArray(transfers) ? transfers : [];

    const combinedItems = [
      ...safeTransactions.map(t => ({ ...t, itemType: 'transaction' })),
      ...safeTransfers.map(t => ({ ...t, itemType: 'transfer' }))
    ];

    if (combinedItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="size-16 text-gray-300 mb-2" />
          <p className="text-gray-500">Sem itens para mostrar</p>
        </div>
      );
    }

    const sortedItems = combinedItems.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    return sortedItems.map((item) => {
      if (item.itemType === 'transaction') {
        return (
          <div key={`transaction-${item._id}`} className="flex items-center p-4 border-b border-base-300">
            <div className="avatar placeholder">
              <div className={`size-10 rounded-full ${item.type === 'deposit' ? 'bg-green-50' : 'bg-red-50'}`}>
                {item.type === 'deposit' ? (
                  <ArrowDownCircle className="size-6 text-green-500" />
                ) : (
                  <ArrowUpCircle className="size-6 text-red-500" />
                )}
              </div>
            </div>
            
            <div className="ml-4 flex-1">
              <p className="font-medium line-clamp-1">
                {item.type === 'deposit' ? 'Depósito' : 'Levantamento'} via {
                  item.method === 'card' ? 'Cartão' :
                  item.method === 'bank_transfer' ? 'Transferência Bancária' : 
                  'Método Desconhecido'
                }
                {item.details?.cardLast4 && ` **** ${item.details.cardLast4}`}
              </p>
              <p className="text-sm text-gray-500">{formatDate(item.createdAt)}</p>
            </div>
            
            <div className="text-right">
              <p className={`font-semibold ${item.type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>
                {item.type === 'deposit' ? '+' : '-'}{formatCurrency(item.amount)}
              </p>
              <div className="flex justify-end mt-1">
                <div className={getStatusClass(item.status)}>
                  {getMethodIcon(item.method)}
                  <span className="ml-1">{getStatusText(item.status)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      } else {
        const isSender = item.sender._id === userId;
        
        return (
          <div key={`transfer-${item._id}`} className="flex items-center p-4 border-b border-base-300">
            <div className="avatar placeholder">
              <div className={`size-10 rounded-full ${isSender ? 'bg-red-50' : 'bg-green-50'}`}>
                <ArrowLeftRight className={`size-6 ${isSender ? 'text-red-500' : 'text-green-500'}`} />
              </div>
            </div>
            
            <div className="ml-4 flex-1">
              <p className="font-medium line-clamp-1">
                {isSender ? 'Transferência para ' : 'Recebido de '}
                <strong>
                  {isSender ? item.receiver.fullName || item.receiver.username : item.sender.fullName || item.sender.username}
                </strong>
              </p>
              <p className="text-sm text-gray-500">{formatDate(item.createdAt)}</p>
            </div>
            
            <div className="text-right">
              <p className={`font-semibold ${isSender ? 'text-red-500' : 'text-green-500'}`}>
                {isSender ? '-' : '+'}{formatCurrency(item.amount)}
              </p>
              <div className="flex justify-end mt-1">
                <div className={getStatusClass(item.status)}>
                  {getStatusText(item.status)}
                </div>
              </div>
            </div>
          </div>
        );
      }
    });
  };

  return (
    <div className="space-y-4 bg-white rounded-lg p-1">
      <div className="tabs tabs-boxed flex">
        <button 
          className={`tab flex-1 px-0 md:px-1 ${activeSubTab === 0 ? 'tab-active' : ''}`}
          onClick={() => setActiveSubTab(0)}
        >
          <span className="hidden sm:inline">Todas</span>
          <span className="sm:hidden">Todas</span>
        </button>
        <button 
          className={`tab flex-1 px-0 md:px-1 ${activeSubTab === 1 ? 'tab-active' : ''}`}
          onClick={() => setActiveSubTab(1)}
        >
          <span className="hidden sm:inline">Depósitos/Levantamentos</span>
          <span className="sm:hidden">Dep./Lev.</span>
        </button>
        <button 
          className={`tab flex-1 px-0 md:px-1 ${activeSubTab === 2 ? 'tab-active' : ''}`}
          onClick={() => setActiveSubTab(2)}
        >
          <span className="hidden sm:inline">Transferências</span>
          <span className="sm:hidden">Transf.</span>
        </button>
      </div>
      
      <div className="max-h-[60vh] overflow-y-auto">
        {activeSubTab === 0 && renderAllItems()}
        {activeSubTab === 1 && renderTransactions()}
        {activeSubTab === 2 && renderTransfers()}
      </div>
    </div>
  );
};

export default TransactionsTab;