import { useState } from 'react';
import { useWalletStore } from '../../store/useWalletStore';
import { CreditCard } from 'lucide-react';
import CardDetailsForm from '../CardDetailsForm';

const DepositTab = ({ refreshData }) => {
  const [amount, setAmount] = useState('');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const [errors, setErrors] = useState({});
  
  const { deposit, isLoading } = useWalletStore();

  const validateAmount = () => {
    let valid = true;
    const newErrors = { ...errors };
    
    if (!amount || amount <= 0) {
      newErrors.amount = 'Insira um valor válido';
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
      await deposit(parseFloat(amount), 'card', cardDetails);
      
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
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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