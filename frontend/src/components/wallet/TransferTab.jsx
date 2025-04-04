import { useState, useEffect, useRef } from 'react';
import { useWalletStore } from '../../store/useWalletStore';
import { Mail, QrCode, Scan, Wallet, X, Camera } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const TransferTab = ({ refreshData, balance }) => {
  const [activeSubTab, setActiveSubTab] = useState(0); // 0: Email, 1: QR Code, 2: Meu QR
  const [receiverEmail, setReceiverEmail] = useState('');
  const [qrData, setQrData] = useState('');
  const [amount, setAmount] = useState('');
  const [myQRCode, setMyQRCode] = useState('');
  const [errors, setErrors] = useState({});
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState('');
  
  const { transfer, transferByQR, generateQRCode, isLoading } = useWalletStore();
  const html5QrCodeRef = useRef(null);
  const qrScannerContainerRef = useRef(null);

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
    
    // Parar o scanner se mudarmos para outra tab
    if (activeSubTab !== 1 && isScanning) {
      stopScannerAndCleanup();
    }
  }, [activeSubTab, generateQRCode, myQRCode, isScanning]);

  // Limpar o scanner quando o componente for desmontado
  useEffect(() => {
    return () => {
      stopScannerAndCleanup();
    };
  }, []);

  // Efeito para iniciar o scanner quando isScanning for true
  useEffect(() => {
    if (isScanning && qrScannerContainerRef.current) {
      try {
        if (html5QrCodeRef.current === null) {
          html5QrCodeRef.current = new Html5Qrcode("qr-scanner-container");
        }

        html5QrCodeRef.current.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: 250
          },
          (decodedText) => {
            // Sucesso no scan
            console.log("QR Code detectado:", decodedText);
            setScanResult(decodedText);
            setQrData(decodedText);
            stopScanner();
          },
          (errorMessage) => {
            // Ignorar erros de scan (acontecem quando nenhum QR code é detectado)
          }
        ).catch((err) => {
          console.error("Erro ao iniciar scanner:", err);
          setIsScanning(false);
        });
      } catch (error) {
        console.error("Erro ao configurar scanner:", error);
        setIsScanning(false);
      }
    }
  }, [isScanning]);

  const startScanner = () => {
    setScanResult('');
    setIsScanning(true);
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current.stop().then(() => {
        setIsScanning(false);
      }).catch(error => {
        console.error("Erro ao parar o scanner:", error);
        setIsScanning(false);
      });
    } else {
      setIsScanning(false);
    }
  };

  // Função completa para limpar o scanner e a referência
  const stopScannerAndCleanup = () => {
    if (html5QrCodeRef.current) {
      if (html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().then(() => {
          html5QrCodeRef.current = null;
          setIsScanning(false);
        }).catch(error => {
          console.error("Erro ao parar o scanner:", error);
          html5QrCodeRef.current = null;
          setIsScanning(false);
        });
      } else {
        html5QrCodeRef.current = null;
        setIsScanning(false);
      }
    }
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
      // Parar o scanner antes da transferência
      stopScannerAndCleanup();
      
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
    setScanResult('');
  };

  // Função para mudar de tab com limpeza adequada
  const handleTabChange = (tabIndex) => {
    if (isScanning) {
      stopScannerAndCleanup();
    }
    setActiveSubTab(tabIndex);
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
          className={`tab flex-1 gap-2 ${activeSubTab === 0 ? 'tab-active' : ''}`}
          onClick={() => handleTabChange(0)}
          type="button"
        >
          <Mail className="size-4" />
          <span className="hidden md:inline">Por Email</span>
        </button>
        <button 
          className={`tab flex-1 gap-2 ${activeSubTab === 1 ? 'tab-active' : ''}`}
          onClick={() => handleTabChange(1)}
          type="button"
        >
          <Scan className="size-4" />
          <span className="hidden md:inline">Por QR Code</span>
        </button>
        <button 
          className={`tab flex-1 gap-2 ${activeSubTab === 2 ? 'tab-active' : ''}`}
          onClick={() => handleTabChange(2)}
          type="button"
        >
          <QrCode className="size-4" />
          <span className="hidden md:inline">Meu QR Code</span>
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
          {isScanning ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Escaneie o QR Code</h3>
                <button 
                  type="button" 
                  className="btn btn-circle btn-sm btn-ghost" 
                  onClick={stopScannerAndCleanup}
                >
                  <X className="size-5" />
                </button>
              </div>
              
              <div className="flex justify-center">
                <div 
                  id="qr-scanner-container" 
                  ref={qrScannerContainerRef}
                  className="w-full max-w-sm h-64 border rounded-lg overflow-hidden"
                ></div>
              </div>
              
              <p className="text-sm text-center opacity-75">
                Posicione o QR code à frente da câmera para ser escaneado automaticamente
              </p>
            </div>
          ) : (
            <>
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
              
              <button
                type="button"
                className="btn btn-outline w-full mb-4"
                onClick={startScanner}
              >
                <Camera className="size-5 mr-2" />
                Escanear QR Code
              </button>
              
              {scanResult && (
                <div className="alert alert-success mb-4">
                  <div className="flex items-center">
                    <QrCode className="size-5 mr-2" />
                    <p>QR Code escaneado com sucesso!</p>
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
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {errors.amount && <span className="text-error text-sm mt-1">{errors.amount}</span>}
              </div>
              
              <button
                type="submit"
                className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}
                disabled={isLoading || !qrData}
              >
                {!isLoading && <Scan className="size-5 mr-2" />}
                {isLoading ? 'Processando...' : 'Transferir por QR Code'}
              </button>
            </>
          )}
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