import { useState, useEffect } from 'react';
import { useWalletStore } from '../../store/useWalletStore';
import { ArrowDownCircle, CreditCard, AlertCircle } from 'lucide-react';
import CardDetailsForm from '../CardDetailsForm';
import axios from 'axios';

const DepositTab = ({ refreshData }) => {
  const [amount, setAmount] = useState('');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const [errors, setErrors] = useState({});
  const [dailyLimit, setDailyLimit] = useState({
    limit: 1000,
    used: 0,
    remaining: 1000
  });
  
  const { deposit, isLoading } = useWalletStore();

  useEffect(() => {
    // Buscar informações sobre o limite diário atual
    const fetchLimitInfo = async () => {
      try {
        // Obter todas as transações
        const response = await axios.get('/api/transactions');
        
        // Filtrar apenas depósitos de hoje
        const today = new Date().toISOString().split('T')[0];
        const todayDeposits = response.data.filter(tx => {
          const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
          return tx.type === 'deposit' && txDate === today;
        });
        
        // Calcular total usado hoje
        const totalUsed = todayDeposits.reduce((sum, tx) => sum + tx.amount, 0);
        
        // Atualizar estado com informações de limite
        setDailyLimit({
          limit: 1000, // Valor fixo do limite diário
          used: totalUsed,
          remaining: Math.max(0, 1000 - totalUsed)
        });
      } catch (error) {
        console.error('Erro ao buscar informações de limite:', error);
      }
    };
    
    fetchLimitInfo();
  }, []);

  const validateAmount = () => {
    let valid = true;
    const newErrors = { ...errors };
    
    if (!amount || amount <= 0) {
      newErrors.amount = 'Insira um valor válido';
      valid = false;
    } else if (amount > dailyLimit.remaining) {
      newErrors.amount = `Limite diário excedido. Disponível: €${dailyLimit.remaining.toFixed(2)}`;
      valid = false;
    } else {
      delete newErrors.amount;
    }
    
    setErrors(newErrors);
    return valid;
  };

  const validateCardDetails = () => {
    let valid = true;
    const newErrors = { ...errors };
    
    if (!cardDetails.number || cardDetails.number.replace(/\s/g, '').length !== 16) {
      newErrors.cardNumber = 'Número de cartão inválido';
      valid = false;
    } else {
      delete newErrors.cardNumber;
    }
    
    if (!cardDetails.expiry || !/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(cardDetails.expiry)) {
      newErrors.expiry = 'Data inválida (MM/YY)';
      valid = false;
    } else {
      delete newErrors.expiry;
    }
    
    if (!cardDetails.cvc || !/^\d{3,4}$/.test(cardDetails.cvc)) {
      newErrors.cvc = 'CVC inválido';
      valid = false;
    } else {
      delete newErrors.cvc;
    }
    
    if (!cardDetails.name || cardDetails.name.trim().length < 3) {
      newErrors.cardName = 'Nome inválido';
      valid = false;
    } else {
      delete newErrors.cardName;
    }
    
    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateAmount() || !validateCardDetails()) {
      return;
    }
    
    try {
      const result = await deposit(parseFloat(amount), 'card', cardDetails);
      
      // Atualizar limite restante se a transação for bem-sucedida
      if (result) {
        setDailyLimit(prev => ({
          ...prev,
          used: prev.used + parseFloat(amount),
          remaining: Math.max(0, prev.remaining - parseFloat(amount))
        }));
      }
      
      resetForm();
      if (refreshData) refreshData();
    } catch (error) {
      console.error(error);
      // Se o erro contiver informações de limite, atualizar o estado
      if (error.response?.data?.limitInfo) {
        setDailyLimit(error.response.data.limitInfo);
      }
    }
  };

  const resetForm = () => {
    setAmount('');
    setCardDetails({
      number: '',
      expiry: '',
      cvc: '',
      name: ''
    });
    setErrors({});
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {dailyLimit.remaining < dailyLimit.limit && (
        <div className="alert alert-warning">
          <AlertCircle className="size-5 mr-2" />
          <div>
            <p>Limite diário: {formatCurrency(dailyLimit.limit)}</p>
            <p>Disponível hoje: {formatCurrency(dailyLimit.remaining)}</p>
          </div>
        </div>
      )}
      
      <div className="form-control">
        <label className="label">
          <span className="label-text">Montante (€)</span>
        </label>
        <input
          type="number"
          className={`input input-bordered w-full ${errors.amount ? 'input-error' : ''}`}
          placeholder="0.00"
          min="1"
          max={dailyLimit.remaining}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {errors.amount && <span className="text-error text-sm mt-1">{errors.amount}</span>}
      </div>
      
      <CardDetailsForm 
        cardDetails={cardDetails}
        setCardDetails={setCardDetails}
        errors={errors}
      />
      
      <button
        type="submit"
        className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}
        disabled={isLoading}
      >
        {!isLoading && <CreditCard className="size-5 mr-2" />}
        {isLoading ? 'Processando...' : 'Depositar Fundos'}
      </button>
    </form>
  );
};

export default DepositTab;