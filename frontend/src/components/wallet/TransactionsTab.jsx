import { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Receipt, CreditCard, Building, Wallet, AlertCircle } from 'lucide-react';

const TransactionsTab = ({ transactions, transfers, userId, isLoading }) => {
  const [activeSubTab, setActiveSubTab] = useState(0); // 0: Todas, 1: Transações, 2: Transferências

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
      case 'paypal':
      case 'crypto':
        return <Wallet className="size-4" />;
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

  // Renderizar transações (depósitos/levantamentos)
  const renderTransactions = () => {
    if (isLoading) {
      return renderSkeletons(3);
    }

    if (transactions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Receipt className="size-16 opacity-30 mb-2" />
          <p className="text-base-content/70">Sem transações para mostrar</p>
        </div>
      );
    }

    return transactions.map((transaction) => (
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
          <p className="font-medium">
            {transaction.type === 'deposit' ? 'Depósito' : 'Levantamento'} via {
              transaction.method === 'card' ? 'Cartão' :
              transaction.method === 'bank_transfer' ? 'Transferência Bancária' :
              transaction.method === 'paypal' ? 'PayPal' : 'Criptomoeda'
            }
            {transaction.details?.cardLast4 && ` **** ${transaction.details.cardLast4}`}
          </p>
          <p className="text-sm opacity-70">{formatDate(transaction.createdAt)}</p>
        </div>
        
        <div className="text-right">
          <p className={`font-semibold ${transaction.type === 'deposit' ? 'text-success' : 'text-error'}`}>
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

  // Renderizar transferências
  const renderTransfers = () => {
    if (isLoading) {
      return renderSkeletons(3);
    }

    if (transfers.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <ArrowLeftRight className="size-16 opacity-30 mb-2" />
          <p className="text-base-content/70">Sem transferências para mostrar</p>
        </div>
      );
    }

    return transfers.map((transfer) => {
      const isSender = transfer.sender._id === userId;
      
      return (
        <div key={transfer._id} className="flex items-center p-4 border-b border-base-300">
          <div className="avatar placeholder">
            <div className={`size-10 rounded-full ${isSender ? 'bg-error/20' : 'bg-success/20'}`}>
              <ArrowLeftRight className={`size-6 ${isSender ? 'text-error' : 'text-success'}`} />
            </div>
          </div>
          
          <div className="ml-4 flex-1">
            <p className="font-medium">
              {isSender ? 'Transferência para ' : 'Recebido de '}
              <strong>
                {isSender ? transfer.receiver.fullName || transfer.receiver.username : transfer.sender.fullName || transfer.sender.username}
              </strong>
            </p>
            <p className="text-sm opacity-70">{formatDate(transfer.createdAt)}</p>
          </div>
          
          <div className="text-right">
            <p className={`font-semibold ${isSender ? 'text-error' : 'text-success'}`}>
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

  // Renderizar todas as transações e transferências combinadas
  const renderAllItems = () => {
    if (isLoading) {
      return renderSkeletons(5);
    }

    if (transactions.length === 0 && transfers.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="size-16 opacity-30 mb-2" />
          <p className="text-base-content/70">Sem itens para mostrar</p>
        </div>
      );
    }

    // Combinar e ordenar por data
    const allItems = [
      ...transactions.map(t => ({ ...t, itemType: 'transaction' })),
      ...transfers.map(t => ({ ...t, itemType: 'transfer' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return allItems.map((item, index) => {
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
              <p className="font-medium">
                {item.type === 'deposit' ? 'Depósito' : 'Levantamento'} via {
                  item.method === 'card' ? 'Cartão' :
                  item.method === 'bank_transfer' ? 'Transferência Bancária' :
                  item.method === 'paypal' ? 'PayPal' : 'Criptomoeda'
                }
                {item.details?.cardLast4 && ` **** ${item.details.cardLast4}`}
              </p>
              <p className="text-sm opacity-70">{formatDate(item.createdAt)}</p>
            </div>
            
            <div className="text-right">
              <p className={`font-semibold ${item.type === 'deposit' ? 'text-success' : 'text-error'}`}>
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
              <p className="font-medium">
                {isSender ? 'Transferência para ' : 'Recebido de '}
                <strong>
                  {isSender ? item.receiver.fullName || item.receiver.username : item.sender.fullName || item.sender.username}
                </strong>
              </p>
              <p className="text-sm opacity-70">{formatDate(item.createdAt)}</p>
            </div>
            
            <div className="text-right">
              <p className={`font-semibold ${isSender ? 'text-error' : 'text-success'}`}>
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
    <div className="space-y-4">
      <div className="tabs tabs-boxed">
        <button 
          className={`tab ${activeSubTab === 0 ? 'tab-active' : ''}`}
          onClick={() => setActiveSubTab(0)}
        >
          Todas
        </button>
        <button 
          className={`tab ${activeSubTab === 1 ? 'tab-active' : ''}`}
          onClick={() => setActiveSubTab(1)}
        >
          Depósitos/Levantamentos
        </button>
        <button 
          className={`tab ${activeSubTab === 2 ? 'tab-active' : ''}`}
          onClick={() => setActiveSubTab(2)}
        >
          Transferências
        </button>
      </div>
      
      <div className="card bg-base-200">
        {activeSubTab === 0 && renderAllItems()}
        {activeSubTab === 1 && renderTransactions()}
        {activeSubTab === 2 && renderTransfers()}
      </div>
    </div>
  );
};

export default TransactionsTab;