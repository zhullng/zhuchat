import { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Receipt, CreditCard, Building, Wallet, AlertCircle } from 'lucide-react';

const TransactionsTab = ({ transactions, transfers, userId, isLoading }) => {
  const [activeSubTab, setActiveSubTab] = useState(0); // 0: Todas, 1: Transações, 2: Transferências

  // Debug para verificar renderização e props
  useEffect(() => {
    console.log('TransactionsTab - FULL DEBUG:', {
      transactions: transactions ? JSON.stringify(transactions) : 'No transactions',
      transfersCount: transfers ? transfers.length : 'No transfers',
      userId,
      isLoading,
      transactionsType: typeof transactions,
      transactionsLength: transactions ? transactions.length : 'N/A'
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

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed':
        return 'badge-success';
      case 'pending':
        return 'badge-warning';
      case 'failed':
        return 'badge-error';
      default:
        return 'badge-ghost';
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

  // Renderizar skeletons para carregamento
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
    console.log('Rendering Transactions - Count:', Array.isArray(transactions) ? transactions.length : 'Not an array');

    if (isLoading) {
      return renderSkeletons(3);
    }

    const safeTransactions = Array.isArray(transactions) ? transactions : [];

    if (safeTransactions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Receipt className="size-16 opacity-30 mb-2" />
          <p className="text-base-content/70">Sem transações para mostrar</p>
        </div>
      );
    }

    return safeTransactions.map((transaction) => (
      <div key={transaction._id} className="flex items-center p-4 border-b border-base-300">
        <div className="avatar placeholder">
          <div className={`size-10 rounded-full ${transaction.type === 'deposit' ? 'bg-success/20' : 'bg-error/20'}`}>
            {transaction.type === 'deposit' ? (
              <ArrowDownCircle className="size-6 text-success" />
            ) : (
              <ArrowUpCircle className="size-6 text-error" />
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
          <p className="text-sm opacity-70 line-clamp-1">{formatDate(transaction.createdAt)}</p>
        </div>
        
        <div className="text-right">
          <p className={`font-semibold line-clamp-1 ${transaction.type === 'deposit' ? 'text-success' : 'text-error'}`}>
            {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
          </p>
          <div className="flex justify-end mt-1">
            <div className={`badge ${getStatusColor(transaction.status)} badge-sm gap-1`}>
              {getMethodIcon(transaction.method)}
              <span>{getStatusText(transaction.status)}</span>
            </div>
          </div>
        </div>
      </div>
    ));
  };

  const renderTransfers = () => {
    console.log('Rendering Transfers - Count:', Array.isArray(transfers) ? transfers.length : 'Not an array');

    if (isLoading) {
      return renderSkeletons(3);
    }

    const safeTransfers = Array.isArray(transfers) ? transfers : [];

    if (safeTransfers.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <ArrowLeftRight className="size-16 opacity-30 mb-2" />
          <p className="text-base-content/70">Sem transferências para mostrar</p>
        </div>
      );
    }

    return safeTransfers.map((transfer) => {
      const isSender = transfer.sender._id === userId;
      
      return (
        <div key={transfer._id} className="flex items-center p-4 border-b border-base-300">
          <div className="avatar placeholder">
            <div className={`size-10 rounded-full ${isSender ? 'bg-error/20' : 'bg-success/20'}`}>
              <ArrowLeftRight className={`size-6 ${isSender ? 'text-error' : 'text-success'}`} />
            </div>
          </div>
          
          <div className="ml-4 flex-1">
            <p className="font-medium line-clamp-1">
              {isSender ? 'Transferência para ' : 'Recebido de '}
              <strong>
                {isSender ? transfer.receiver.fullName || transfer.receiver.username : transfer.sender.fullName || transfer.sender.username}
              </strong>
            </p>
            <p className="text-sm opacity-70 line-clamp-1">{formatDate(transfer.createdAt)}</p>
          </div>
          
          <div className="text-right">
            <p className={`font-semibold line-clamp-1 ${isSender ? 'text-error' : 'text-success'}`}>
              {isSender ? '-' : '+'}{formatCurrency(transfer.amount)}
            </p>
            <div className="flex justify-end mt-1">
              <div className={`badge ${getStatusColor(transfer.status)} badge-sm`}>
                {getStatusText(transfer.status)}
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  const renderAllItems = () => {
    console.log('Rendering ALL ITEMS');

    if (isLoading) {
      return renderSkeletons(5);
    }

    // Garantir que transactions e transfers sejam arrays, mesmo se undefined
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    const safeTransfers = Array.isArray(transfers) ? transfers : [];

    const combinedItems = [
      ...safeTransactions.map(t => ({ ...t, itemType: 'transaction' })),
      ...safeTransfers.map(t => ({ ...t, itemType: 'transfer' }))
    ];

    if (combinedItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="size-16 opacity-30 mb-2" />
          <p className="text-base-content/70">Sem itens para mostrar</p>
        </div>
      );
    }

    // Ordenar por data
    const sortedItems = combinedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return sortedItems.map((item) => {
      if (item.itemType === 'transaction') {
        return (
          <div key={`transaction-${item._id}`} className="flex items-center p-4 border-b border-base-300">
            <div className="avatar placeholder">
              <div className={`size-10 rounded-full ${item.type === 'deposit' ? 'bg-success/20' : 'bg-error/20'}`}>
                {item.type === 'deposit' ? (
                  <ArrowDownCircle className="size-6 text-success" />
                ) : (
                  <ArrowUpCircle className="size-6 text-error" />
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
              <p className="text-sm opacity-70 line-clamp-1">{formatDate(item.createdAt)}</p>
            </div>
            
            <div className="text-right">
              <p className={`font-semibold line-clamp-1 ${item.type === 'deposit' ? 'text-success' : 'text-error'}`}>
                {item.type === 'deposit' ? '+' : '-'}{formatCurrency(item.amount)}
              </p>
              <div className="flex justify-end mt-1">
                <div className={`badge ${getStatusColor(item.status)} badge-sm gap-1`}>
                  {getMethodIcon(item.method)}
                  <span>{getStatusText(item.status)}</span>
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
              <div className={`size-10 rounded-full ${isSender ? 'bg-error/20' : 'bg-success/20'}`}>
                <ArrowLeftRight className={`size-6 ${isSender ? 'text-error' : 'text-success'}`} />
              </div>
            </div>
            
            <div className="ml-4 flex-1">
              <p className="font-medium line-clamp-1">
                {isSender ? 'Transferência para ' : 'Recebido de '}
                <strong>
                  {isSender ? item.receiver.fullName || item.receiver.username : item.sender.fullName || item.sender.username}
                </strong>
              </p>
              <p className="text-sm opacity-70 line-clamp-1">{formatDate(item.createdAt)}</p>
            </div>
            
            <div className="text-right">
              <p className={`font-semibold line-clamp-1 ${isSender ? 'text-error' : 'text-success'}`}>
                {isSender ? '-' : '+'}{formatCurrency(item.amount)}
              </p>
              <div className="flex justify-end mt-1">
                <div className={`badge ${getStatusColor(item.status)} badge-sm`}>
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
    <div className="space-y-4 bg-white rounded-lg p-4">
      <div className="tabs tabs-boxed flex">
        <button 
          className={`tab flex-1 ${activeSubTab === 0 ? 'tab-active' : ''}`}
          onClick={() => setActiveSubTab(0)}
        >
          Todas
        </button>
        <button 
          className={`tab flex-1 ${activeSubTab === 1 ? 'tab-active' : ''}`}
          onClick={() => setActiveSubTab(1)}
        >
          Depósitos/Levantamentos
        </button>
        <button 
          className={`tab flex-1 ${activeSubTab === 2 ? 'tab-active' : ''}`}
          onClick={() => setActiveSubTab(2)}
        >
          Transferências
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