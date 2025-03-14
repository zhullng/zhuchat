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
    fetchWalletData 
  } = useWalletStore();

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
  }, [fetchWalletData]);

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

  return (
    <div className="flex min-h-screen pt-16 pl-20 sm:pl-24 sm:pt-0 overflow-x-hidden">
      <div className="flex-1 mx-auto px-4 py-6 w-[96%] max-w-7xl">
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
                          onClick={() => setActiveTab(tab.id)}
                        >
                          {tab.icon}
                          <span className="hidden md:inline">{tab.label}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-2 max-h-[70vh] overflow-y-auto">
                  {activeTab === 0 && <DepositTab refreshData={fetchWalletData} />}
                  {activeTab === 1 && <WithdrawTab refreshData={fetchWalletData} balance={balance} />}
                  {activeTab === 2 && <TransferTab refreshData={fetchWalletData} balance={balance} />}
                  {activeTab === 3 && (
                    <TransactionsTab 
                      transactions={transactions} 
                      transfers={transfers} 
                      userId={authUser?._id} 
                      isLoading={isLoading} 
                    />
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