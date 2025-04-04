import { useEffect, useState } from 'react';
import { useWalletStore } from '../store/useWalletStore';
import { useAuthStore } from '../store/useAuthStore';
import { Wallet, ArrowDownCircle, ArrowUpCircle, SendHorizontal, Receipt } from 'lucide-react';
import BalanceCard from '../components/wallet/BalanceCard';
import DepositTab from '../components/wallet/DepositTab';
import WithdrawTab from '../components/wallet/WithdrawTab';
import TransferTab from '../components/wallet/TransferTab';
import TransactionsTab from '../components/wallet/TransactionsTab';

const WalletPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { authUser } = useAuthStore();
  const { 
    balance, 
    transactions, 
    transfers, 
    isLoading, 
    fetchWalletData,
    setupWalletListeners 
  } = useWalletStore();

  // Carregar dados da carteira quando o componente montar
  useEffect(() => {
    const loadWalletData = async () => {
      try {
        await fetchWalletData();
        console.log('Dados da carteira carregados com sucesso');
      } catch (error) {
        console.error('Erro ao carregar dados da carteira:', error);
      }
    };
    
    loadWalletData();
    
    // Configurar listeners para atualizações de carteira
    setupWalletListeners();
    
    // Recarregar dados da carteira a cada 30 segundos para manter atualizado
    const intervalId = setInterval(() => {
      fetchWalletData();
    }, 30000);
    
    // Limpar intervalo quando o componente for desmontado
    return () => clearInterval(intervalId);
  }, [fetchWalletData, setupWalletListeners]);

  const tabs = [
    { 
      id: 0, 
      label: 'Depositar', 
      icon: <ArrowDownCircle className="size-6" />,
      tooltip: 'Adicionar Fundos'
    },
    { 
      id: 1, 
      label: 'Levantar', 
      icon: <ArrowUpCircle className="size-6" />,
      tooltip: 'Retirar Fundos'
    },
    { 
      id: 2, 
      label: 'Transferir', 
      icon: <SendHorizontal className="size-6" />,
      tooltip: 'Enviar Dinheiro'
    },
    { 
      id: 3, 
      label: 'Transações', 
      icon: <Receipt className="size-6" />,
      tooltip: 'Histórico'
    },
  ];

  // Tratar a mudança de tab
  const handleTabChange = (tabId) => {
    // Se estiver indo para a tab de transações, recarregar os dados
    if (tabId === 3) {
      fetchWalletData();
    }
    setActiveTab(tabId);
  };

  return (
    <div className="flex min-h-screen pt-16 pl-20 sm:pl-24 sm:pt-0 overflow-x-hidden">
      <div className="flex-1 container mx-auto px-1 py-6 max-w-6xl">
        <div className="flex items-center mb-6">
          <Wallet className="size-6 mr-2" />
          <h1 className="text-2xl font-bold">Minha Carteira</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 order-1 lg:order-none">
            <BalanceCard 
              balance={balance} 
              userName={authUser?.fullName || authUser?.username || 'Utilizador'} 
              isLoading={isLoading} 
            />
          </div>

          <div className="lg:col-span-2 order-2 lg:order-none">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="overflow-x-auto mb-4">
                  <div className="tabs tabs-boxed flex w-full">
                    {tabs.map(tab => (
                      <div 
                        key={tab.id} 
                        className="tooltip flex-1" 
                        data-tip={tab.tooltip}
                      >
                        <button
                          className={`tab w-full flex-1 gap-2 ${activeTab === tab.id ? 'tab-active' : ''}`}
                          onClick={() => handleTabChange(tab.id)}
                        >
                          {tab.icon}
                          <span className="hidden md:inline">{tab.label}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-1 max-h-[70vh] overflow-y-auto">
                  {activeTab === 0 && <DepositTab refreshData={fetchWalletData} />}
                  {activeTab === 1 && <WithdrawTab refreshData={fetchWalletData} balance={balance} />}
                  {activeTab === 2 && <TransferTab refreshData={fetchWalletData} balance={balance} />}
                  {activeTab === 3 && (
                    authUser ? (
                      <TransactionsTab 
                        transactions={transactions} 
                        transfers={transfers} 
                        userId={authUser._id} 
                        isLoading={isLoading} 
                      />
                    ) : (
                      <div className="text-center py-8">
                        <p>Por favor, faça login para visualizar o histórico de transações</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;