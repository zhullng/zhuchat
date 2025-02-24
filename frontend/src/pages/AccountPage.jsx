import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const AccountPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [amount, setAmount] = useState('');
  const { authUser, setAuthUser } = useAuthStore();
  const pollingIntervalRef = useRef(null);
  const socketRef = useRef(null);
  
  // URLs base para APIs e WebSockets
  const baseURL = 'https://zhuchat.onrender.com';
  const apiURL = `${baseURL}/api/transfers`;
  
  useEffect(() => {
    if (authUser?._id) {
      // Carregar o saldo e histórico imediatamente ao entrar na página
      refreshBalance(false);
      fetchTransferHistory();
      
      // Configurar atualização rápida a cada 2 segundos
      pollingIntervalRef.current = setInterval(() => {
        refreshBalance(false);
        fetchTransferHistory();
      }, 2000); // 2 segundos para atualizações mais frequentes
      
      // Tenta configurar WebSocket se disponível
      try {
        setupWebSocket();
      } catch (error) {
        console.log('WebSocket não disponível, usando apenas polling');
      }
      
      // Limpar os recursos quando o componente for desmontado
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        if (socketRef.current) {
          socketRef.current.close();
        }
      };
    }
  }, [authUser?._id]);

  const setupWebSocket = () => {
    // Tenta conectar ao WebSocket (se existir)
    try {
      // Converte de HTTP para WS mantendo o mesmo host
      const wsBaseURL = baseURL.replace('https://', 'wss://').replace('http://', 'ws://');
      socketRef.current = new WebSocket(`${wsBaseURL}/ws/balance/${authUser._id}`);
      
      socketRef.current.onopen = () => {
        console.log('WebSocket conectado para atualizações em tempo real');
        // Se WebSocket conectou com sucesso, podemos reduzir a frequência de polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = setInterval(() => {
            refreshBalance(false);
            fetchTransferHistory();
          }, 10000); // Com WebSocket funcionando, polling a cada 10s é suficiente como backup
        }
      };
      
      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'balance_update' || data.type === 'balance') {
          setAuthUser((prev) => ({ ...prev, balance: data.balance }));
        } else if (data.type === 'transfer' || data.type === 'transaction') {
          fetchTransferHistory();
        }
      };
      
      socketRef.current.onclose = () => {
        console.log('WebSocket desconectado, voltando ao polling frequente');
        // Se WebSocket desconectar, voltamos ao polling mais frequente
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = setInterval(() => {
            refreshBalance(false);
            fetchTransferHistory();
          }, 2000);
        }
      };
      
      socketRef.current.onerror = (error) => {
        console.error('WebSocket erro:', error);
      };
    } catch (error) {
      console.log('WebSocket não suportado ou não disponível');
    }
  };

  const fetchTransferHistory = async () => {
    try {
      const response = await axios.get(`${apiURL}/history/${authUser._id}`);
      setTransfers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    }
  };

  const refreshBalance = async (showLoading = true) => {
    if (!authUser?._id) return;

    try {
      const response = await axios.get(`${apiURL}/balance/${authUser._id}`);
      if (response.data && response.data.balance !== undefined) {
        setAuthUser((prev) => ({ ...prev, balance: response.data.balance }));
      }
    } catch (error) {
      console.error('Erro ao atualizar saldo:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || amount <= 0 || (modalAction === 'transfer' && !receiverEmail)) {
      toast.error('Todos os campos são obrigatórios');
      return;
    }

    try {
      // Otimismo UI: Atualizar o saldo imediatamente na interface
      const numAmount = Number(amount);
      if (modalAction === 'deposit') {
        setAuthUser((prev) => ({ 
          ...prev, 
          balance: prev.balance + numAmount 
        }));
      } else if (modalAction === 'withdraw' || modalAction === 'transfer') {
        setAuthUser((prev) => ({ 
          ...prev, 
          balance: prev.balance - numAmount 
        }));
      }
      
      const endpoint = modalAction === 'deposit' ? `${apiURL}/deposit` :
                       modalAction === 'withdraw' ? `${apiURL}/withdraw` :
                       `${apiURL}/transfer`;
      
      const payload = modalAction === 'transfer' 
        ? { senderId: authUser._id, receiverEmail, amount: numAmount }
        : { userId: authUser._id, amount: numAmount };
  
      const response = await axios.post(endpoint, payload);
      toast.success(response.data.message);
            
      // Ainda assim, atualizar do servidor para garantir precisão
      setTimeout(() => {
        refreshBalance(false);
        fetchTransferHistory();
      }, 300);
      
      setReceiverEmail('');
      setAmount('');
      setShowModal(false);
    } catch (error) {
      // Em caso de erro, reverte a UI otimista e mostra o erro
      toast.error(error.response?.data?.error || 'Erro ao processar a operação');
      refreshBalance(false); // Recarregar saldo real
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 pl-20 sm:pl-24 p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-800">Minha Conta</h1>

        <div className="bg-blue-400 p-6 rounded-lg text-white text-center">
          <p className="text-lg">Saldo Atual</p>
          <p className="text-4xl font-semibold">
            €{authUser?.balance?.toFixed(2) ?? '0.00'}
          </p>
          <p className="text-xs mt-2">Atualização em tempo real</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button onClick={() => { setModalAction('deposit'); setShowModal(true); }} className="btn bg-blue-500 text-white w-full">Depositar</button>
          <button onClick={() => { setModalAction('transfer'); setShowModal(true); }} className="btn bg-blue-500 text-white w-full">Transferir</button>
          <button onClick={() => { setModalAction('withdraw'); setShowModal(true); }} className="btn bg-blue-500 text-white w-full">Sacar</button>
        </div>

        <h2 className="text-xl font-semibold text-gray-800">Transações</h2>
        <div className="space-y-4 bg-gray-50 p-4 rounded-lg max-h-80 overflow-y-auto">
          {transfers.length === 0 ? (
            <p className="text-center text-gray-500">Nenhuma transação encontrada</p>
          ) : (
            transfers.map((transfer) => (
              <div key={transfer._id} className="flex justify-between p-2 border-b border-gray-300">
                <div>
                  <p className="font-medium text-gray-700">
                    {transfer.sender._id === authUser._id ? authUser.fullName : transfer.sender.fullName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(transfer.createdAt).toLocaleString('pt-PT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <p className={transfer.sender._id === authUser._id ? 'text-red-500' : 'text-green-500'}>
                  {transfer.sender._id === authUser._id ? '-' : '+'}€{transfer.amount.toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md">
            <h2 className="text-2xl font-semibold mb-4">
              {modalAction === 'deposit' ? 'Depositar' : modalAction === 'transfer' ? 'Transferir' : 'Sacar'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {modalAction === 'transfer' && (
                <input
                  type="email"
                  placeholder="E-mail do destinatário"
                  value={receiverEmail}
                  onChange={(e) => setReceiverEmail(e.target.value)}
                  className="input input-bordered w-full"
                  required
                />
              )}
              <input
                type="number"
                placeholder="Valor"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input input-bordered w-full"
                required
              />
              <button type="submit" className="btn bg-blue-500 text-white w-full">
                {modalAction === 'deposit' ? 'Depositar' : modalAction === 'transfer' ? 'Transferir' : 'Sacar'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost w-full">Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountPage;