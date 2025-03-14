import { useState } from 'react';
import { useWalletStore } from '../../store/useWalletStore';
import { CreditCard, Wallet, ArrowDownCircle } from 'lucide-react';
import CardDetailsForm from '../CardDetailsForm';

const DepositTab = ({ refreshData }) => {
  const [depositMethod, setDepositMethod] = useState('card');
  const [amount, setAmount] = useState('');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const [bankDetails, setBankDetails] = useState({
    reference: '',
    accountName: ''
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

  const validateBankDetails = () => {
    let valid = true;
    const newErrors = { ...errors };
    
    if (depositMethod === 'bank_transfer' && !bankDetails.reference) {
      newErrors.reference = 'Referência obrigatória';
      valid = false;
    } else {
      delete newErrors.reference;
    }
    
    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar o montante para todos os métodos
    if (!validateAmount()) {
      return;
    }
    
    try {
      // Validação específica por método
      if (depositMethod === 'card') {
        if (!validateCardDetails()) {
          return;
        }
        
        await deposit(parseFloat(amount), 'card', cardDetails);
      } else {
        if (!validateBankDetails()) {
          return;
        }
        
        await deposit(
          parseFloat(amount), 
          depositMethod,
          depositMethod === 'bank_transfer' ? bankDetails : {}
        );
      }
      
      // Limpar formulário após depósito bem-sucedido
      resetForm();
      if (refreshData) refreshData();
    } catch (error) {
      // Erro já tratado no store
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
    setBankDetails({
      reference: '',
      accountName: ''
    });
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text">Método de Depósito</span>
        </label>
        <select 
          className="select select-bordered w-full" 
          value={depositMethod}
          onChange={(e) => setDepositMethod(e.target.value)}
        >
          <option value="card">Cartão de Crédito/Débito</option>
          <option value="bank_transfer">Transferência Bancária</option>
          <option value="paypal">PayPal</option>
          <option value="crypto">Criptomoeda</option>
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
      
      {depositMethod === 'card' ? (
        <CardDetailsForm 
          cardDetails={cardDetails}
          setCardDetails={setCardDetails}
          errors={errors}
        />
      ) : depositMethod === 'bank_transfer' ? (
        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Referência da Transferência</span>
            </label>
            <input
              type="text"
              className={`input input-bordered w-full ${errors.reference ? 'input-error' : ''}`}
              placeholder="Referência"
              value={bankDetails.reference}
              onChange={(e) => setBankDetails({...bankDetails, reference: e.target.value})}
            />
            {errors.reference && <span className="text-error text-sm mt-1">{errors.reference}</span>}
          </div>
          
          <div className="alert alert-info">
            <div>
              <p>Utilize os seguintes dados para a transferência:</p>
              <p>IBAN: PT50 0000 0000 0000 0000 0000 0</p>
              <p>Nome: DigitalWallet S.A.</p>
              <p>Referência: {bankDetails.reference || 'Será gerada após submissão'}</p>
            </div>
          </div>
        </div>
      ) : depositMethod === 'paypal' ? (
        <div className="alert alert-info">
          <div>
            <p>Será redirecionado para o PayPal para concluir o depósito após clicar no botão abaixo.</p>
          </div>
        </div>
      ) : (
        <div className="alert alert-info">
          <div>
            <p>Será redirecionado para processar seu depósito em criptomoeda após clicar no botão abaixo.</p>
          </div>
        </div>
      )}
      
      <button
        type="submit"
        className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}
        disabled={isLoading}
      >
        {!isLoading && (depositMethod === 'card' ? <CreditCard className="size-5 mr-2" /> : <Wallet className="size-5 mr-2" />)}
        {isLoading ? 'Processando...' : 'Depositar Fundos'}
      </button>
    </form>
  );
};

export default DepositTab;