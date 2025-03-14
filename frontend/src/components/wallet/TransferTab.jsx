import { useState, useEffect } from 'react';
import { useWalletStore } from '../../store/useWalletStore';
import { Mail, QrCode, Scan, Wallet } from 'lucide-react';

const TransferTab = ({ refreshData, balance }) => {
  const [activeSubTab, setActiveSubTab] = useState(0); // 0: Email, 1: QR Code, 2: Meu QR
  const [receiverEmail, setReceiverEmail] = useState('');
  const [qrData, setQrData] = useState('');
  const [amount, setAmount] = useState('');
  const [myQRCode, setMyQRCode] = useState('');
  const [errors, setErrors] = useState({});
  
  const { transfer, transferByQR, generateQRCode, isLoading } = useWalletStore();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  // Gerar QR Code quando a tab "Meu QR" for selecionada
  useEffect(() => {
    if (activeSubTab === 2 && !myQRCode) {
      const loadQRCode = async () => {
        try {
          console.log('Solicitando QR code...');
          const qrCodeData = await generateQRCode();
          console.log('QR code recebido:', qrCodeData ? 'Sim' : 'Não');
          setMyQRCode(qrCodeData);
        } catch (error) {
          console.error('Erro ao gerar QR code:', error);
        }
      };
      
      loadQRCode();
    }
  }, [activeSubTab, generateQRCode, myQRCode]);

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

  const validateEmail = () => {
    let valid = true;
    const newErrors = { ...errors };
    
    if (!receiverEmail || !receiverEmail.includes('@')) {
      newErrors.email = 'Email inválido';
      valid = false;
    } else {
      delete newErrors.email;
    }
    
    setErrors(newErrors);
    return valid;
  };

  const validateQRData = () => {
    let valid = true;
    const newErrors = { ...errors };
    
    if (!qrData || qrData.trim() === '') {
      newErrors.qrData = 'Dados do QR code inválidos';
      valid = false;
    } else {
      delete newErrors.qrData;
    }
    
    setErrors(newErrors);
    return valid;
  };

  const handleEmailTransfer = async (e) => {
    e.preventDefault();
    
    if (!validateAmount() || !validateEmail()) {
      return;
    }
    
    try {
      await transfer(receiverEmail, parseFloat(amount));
      resetForm();
      if (refreshData) refreshData();
    } catch (error) {
      // Erro já tratado no store
      console.error(error);
    }
  };

  const handleQRTransfer = async (e) => {
    e.preventDefault();
    
    if (!validateAmount() || !validateQRData()) {
      return;
    }
    
    try {
      await transferByQR(qrData, parseFloat(amount));
      resetForm();
      if (refreshData) refreshData();
    } catch (error) {
      // Erro já tratado no store
      console.error(error);
    }
  };

  const resetForm = () => {
    setReceiverEmail('');
    setQrData('');
    setAmount('');
    setErrors({});
  };

  return (
    <div className="space-y-4">
      <div className="alert alert-info">
        <div className="flex items-center">
          <Wallet className="size-5 mr-2" />
          <p>Saldo disponível: <strong>{formatCurrency(balance)}</strong></p>
        </div>
      </div>
      
      <div className="tabs tabs-boxed">
        <button 
          className={`tab ${activeSubTab === 0 ? 'tab-active' : ''}`}
          onClick={() => setActiveSubTab(0)}
        >
          <Mail className="size-4 mr-1" />
          Por Email
        </button>
        <button 
          className={`tab ${activeSubTab === 1 ? 'tab-active' : ''}`}
          onClick={() => setActiveSubTab(1)}
        >
          <Scan className="size-4 mr-1" />
          Por QR Code
        </button>
        <button 
          className={`tab ${activeSubTab === 2 ? 'tab-active' : ''}`}
          onClick={() => setActiveSubTab(2)}
        >
          <QrCode className="size-4 mr-1" />
          Meu QR Code
        </button>
      </div>
      
      {activeSubTab === 0 && (
        <form onSubmit={handleEmailTransfer} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Email do Destinatário</span>
            </label>
            <div className="input-group">
              <span>
                <Mail className="size-5" />
              </span>
              <input
                type="email"
                className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
                placeholder="email@exemplo.com"
                value={receiverEmail}
                onChange={(e) => setReceiverEmail(e.target.value)}
              />
            </div>
            {errors.email && <span className="text-error text-sm mt-1">{errors.email}</span>}
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
          
          <button
            type="submit"
            className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {!isLoading && <Mail className="size-5 mr-2" />}
            {isLoading ? 'Processando...' : 'Transferir'}
          </button>
        </form>
      )}
      
      {activeSubTab === 1 && (
        <form onSubmit={handleQRTransfer} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Dados do QR Code</span>
            </label>
            <div className="input-group">
              <span>
                <QrCode className="size-5" />
              </span>
              <input
                type="text"
                className={`input input-bordered w-full ${errors.qrData ? 'input-error' : ''}`}
                placeholder="Cole os dados do QR code escaneado"
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
              />
            </div>
            {errors.qrData && <span className="text-error text-sm mt-1">{errors.qrData}</span>}
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
          
          <button
            type="submit"
            className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {!isLoading && <Scan className="size-5 mr-2" />}
            {isLoading ? 'Processando...' : 'Transferir por QR Code'}
          </button>
        </form>
      )}
      
      {activeSubTab === 2 && (
        <div className="flex flex-col items-center space-y-4">
          <h3 className="text-lg font-semibold">Meu Código QR para Receber Transferências</h3>
          
          <p className="text-sm text-center opacity-75">
            Partilhe este código QR para receber transferências instantâneas
          </p>
          
          {isLoading && !myQRCode ? (
            <div className="skeleton w-64 h-64"></div>
          ) : myQRCode ? (
            <div className="bg-white p-4 rounded-lg">
              <img 
                src={myQRCode} 
                alt="Seu código QR" 
                className="w-64 h-64 object-contain" 
              />
            </div>
          ) : (
            <div className="alert alert-warning">
              <div>
                <p>Não foi possível gerar o QR code. Tente novamente mais tarde.</p>
              </div>
            </div>
          )}
          
          <p className="text-sm text-center opacity-75 mt-4">
            Cada utilizador tem um código QR único associado à sua conta.
            Este código pode ser usado para receber pagamentos de outros utilizadores sem necessidade de partilhar o seu email.
          </p>
        </div>
      )}
    </div>
  );
};

export default TransferTab;