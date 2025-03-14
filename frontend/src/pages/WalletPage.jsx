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
    fetchWalletData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = [
    { id: 0, label: 'Depositar', icon: <ArrowDownCircle className="size-4" /> },
    { id: 1, label: 'Levantar', icon: <ArrowUpCircle className="size-4" /> },
    { id: 2, label: 'Transferir', icon: <SendHorizontal className="size-4" /> },
    { id: 3, label: 'Transações', icon: <Receipt className="size-4" /> },
  ];

  return (
    <div className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex items-center mb-6">
        <Wallet className="size-6 mr-2" />
        <h1 className="text-2xl font-bold">Minha Carteira</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cartão de saldo */}
        <div className="md:col-span-1">
          <BalanceCard 
            balance={balance} 
            userName={authUser?.fullName || authUser?.username || 'Utilizador'} 
            isLoading={isLoading} 
          />
        </div>

        {/* Painel de operações */}
        <div className="md:col-span-2">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              {/* Tabs */}
              <div className="tabs tabs-boxed mb-4">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    className={`tab gap-1 ${activeTab === tab.id ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Conteúdo das tabs */}
              <div className="p-2">
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
  );
};

export default WalletPage;