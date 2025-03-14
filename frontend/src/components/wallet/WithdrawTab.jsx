import { useState } from 'react';
import { useWalletStore } from '../../store/useWalletStore';
import { ArrowUpCircle, Wallet, Building, User } from 'lucide-react';
import CardDetailsForm from '../CardDetailsForm';

const WithdrawTab = ({ refreshData, balance }) => {
  const [withdrawMethod, setWithdrawMethod] = useState('card');
  const [amount, setAmount] = useState('');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const [withdrawDetails, setWithdrawDetails] = useState({
    accountNumber: '',
    accountName: '',
    bankName: '',
    swiftCode: ''
  });
  const [errors, setErrors] = useState({});
  
  const { withdraw, isLoading } = useWalletStore();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const validateAmount = () => {
    let valid = true;
    const newErrors = { ...errors };
    
    if (!amount || amount <= 0) {
      newErrors.amount = 'Insira um valor válido';
      valid = false;
    } else if (amount > balance) {
      newErrors.amount = 'Saldo insuficiente';
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

  const validateWithdrawDetails = () => {
    let valid = true;
    const newErrors = { ...errors };
    
    if (withdrawMethod === 'bank_transfer') {
      if (!withdrawDetails.accountNumber || withdrawDetails.accountNumber.trim() === '') {
        newErrors.accountNumber = 'Número de conta obrigatório';
        valid = false;
      } else {
        delete newErrors.accountNumber;
      }
      
      if (!withdrawDetails.accountName || withdrawDetails.accountName.trim() === '') {
        newErrors.accountName = 'Nome do titular obrigatório';
        valid = false;
      } else {
        delete newErrors.accountName;
      }
      
      if (!withdrawDetails.bankName || withdrawDetails.bankName.trim() === '') {
        newErrors.bankName = 'Nome do banco obrigatório';
        valid = false;
      } else {
        delete newErrors.bankName;
      }
    }
    
    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateAmount()) {
      return;
    }
    
    try {
      if (withdrawMethod === 'card') {
        if (!validateCardDetails()) {
          return;
        }
        
        await withdraw(parseFloat(amount), 'card', cardDetails);
      } else {
        if (!validateWithdrawDetails()) {
          return;
        }
        
        await withdraw(parseFloat(amount), withdrawMethod, withdrawDetails);
      }
      
      resetForm();
      if (refreshData) refreshData();
    } catch (error) {
      console.error(error);
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
    setWithdrawDetails({
      accountNumber: '',
      accountName: '',
      bankName: '',
      swiftCode: ''
    });
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="alert alert-info">
        <div className="flex items-center">
          <Wallet className="size-5 mr-2" />
          <p>Saldo disponível: <strong>{formatCurrency(balance)}</strong></p>
        </div>
      </div>
      
      <div className="form-control">
        <label className="label">
          <span className="label-text">Método de Levantamento</span>
        </label>
        <select 
          className="select select-bordered w-full" 
          value={withdrawMethod}
          onChange={(e) => setWithdrawMethod(e.target.value)}
        >
          <option value="card">Cartão</option>
          <option value="bank_transfer">Transferência Bancária</option>
        </select>
      </div>
      
      <div className="form-control">
        <label className="label">
          <span className="label-text">Montante (€)</span>
        </label>
        <input
          type="number"
          className={`input input-bordered w-full ${errors.amount ? 'input-error' : ''}`}
          placeholder="0.00"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {errors.amount && <span className="text-error text-sm mt-1">{errors.amount}</span>}
      </div>
      
      {withdrawMethod === 'card' ? (
        <CardDetailsForm 
          cardDetails={cardDetails}
          setCardDetails={setCardDetails}
          errors={errors}
        />
      ) : (
        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Número de Conta</span>
            </label>
            <div className="input-group">
              <span>
                <Building className="size-5" />
              </span>
              <input
                type="text"
                className={`input input-bordered w-full ${errors.accountNumber ? 'input-error' : ''}`}
                placeholder="Número de Conta / IBAN"
                value={withdrawDetails.accountNumber}
                onChange={(e) => setWithdrawDetails({...withdrawDetails, accountNumber: e.target.value})}
              />
            </div>
            {errors.accountNumber && <span className="text-error text-sm mt-1">{errors.accountNumber}</span>}
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Nome do Titular</span>
            </label>
            <div className="input-group">
              <span>
                <User className="size-5" />
              </span>
              <input
                type="text"
                className={`input input-bordered w-full ${errors.accountName ? 'input-error' : ''}`}
                placeholder="Nome do Titular"
                value={withdrawDetails.accountName}
                onChange={(e) => setWithdrawDetails({...withdrawDetails, accountName: e.target.value})}
              />
            </div>
            {errors.accountName && <span className="text-error text-sm mt-1">{errors.accountName}</span>}
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Banco</span>
            </label>
            <div className="input-group">
              <span>
                <Building className="size-5" />
              </span>
              <input
                type="text"
                className={`input input-bordered w-full ${errors.bankName ? 'input-error' : ''}`}
                placeholder="Nome do Banco"
                value={withdrawDetails.bankName}
                onChange={(e) => setWithdrawDetails({...withdrawDetails, bankName: e.target.value})}
              />
            </div>
            {errors.bankName && <span className="text-error text-sm mt-1">{errors.bankName}</span>}
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Código SWIFT/BIC (opcional)</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Código SWIFT/BIC"
              value={withdrawDetails.swiftCode}
              onChange={(e) => setWithdrawDetails({...withdrawDetails, swiftCode: e.target.value})}
            />
          </div>
        </div>
      )}
      
      <button
        type="submit"
        className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}
        disabled={isLoading}
      >
        {!isLoading && <ArrowUpCircle className="size-5 mr-2" />}
        {isLoading ? 'Processando...' : 'Levantar Fundos'}
      </button>
    </form>
  );
};

export default WithdrawTab;