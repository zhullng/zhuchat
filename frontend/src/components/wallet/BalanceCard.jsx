import { Wallet, User } from 'lucide-react';

const BalanceCard = ({ balance, userName, isLoading }) => {
  // Garantir que balance é um número
  const numericBalance = typeof balance === 'number' ? balance : 0;
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };
  
  // Log para depuração
  console.log('Rendering BalanceCard with balance:', numericBalance);

  return (
    <div className="card bg-primary text-primary-content shadow-xl">
      <div className="card-body">
        <div className="absolute top-4 right-4 opacity-10">
          <Wallet className="size-20" />
        </div>
        
        <h2 className="card-title mb-2">Saldo Disponível</h2>
        
        {isLoading ? (
          <div className="skeleton h-12 w-4/5 mb-4"></div>
        ) : (
          <p className="text-3xl font-bold mb-4">{formatCurrency(numericBalance)}</p>
        )}
        
        <div className="divider"></div>
        
        <div className="flex items-center">
          <User className="size-5 mr-2" />
          <div>
            <p className="text-sm opacity-80">Titular da Conta</p>
            {isLoading ? (
              <div className="skeleton h-5 w-32 mt-1"></div>
            ) : (
              <p className="font-medium">{userName}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceCard;