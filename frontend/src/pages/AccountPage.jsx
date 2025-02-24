import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import io from 'socket.io-client';

const AccountPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [amount, setAmount] = useState('');
  const { authUser, setAuthUser } = useAuthStore();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!authUser?._id) return;
    
    const socketConnection = io('http://localhost:5000', {
      query: { userId: authUser._id },
    });

    socketConnection.on('connect', () => {
      console.log('Conectado ao WebSocket');
    });

    socketConnection.on('balanceUpdated', (newBalance) => {
      console.log("Novo saldo recebido via WebSocket:", newBalance);
      setAuthUser((prev) => ({ ...prev, balance: newBalance }));
    });

    socketConnection.on('transferNotification', (data) => {
      if (data.type === 'sent') {
        toast.success(`Você enviou €${data.amount}`);
      } else if (data.type === 'received') {
        toast.success(`Você recebeu €${data.amount}`);
      }
    });

    socketConnection.on('updateTransferHistory', fetchTransferHistory);

    fetchTransferHistory();
    setSocket(socketConnection);

    return () => {
      socketConnection.disconnect();
    };
  }, [authUser?._id]);

  const fetchTransferHistory = async () => {
    try {
      const response = await axios.get(`/api/transfers/history/${authUser._id}`);
      setTransfers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erro ao buscar histórico de transferências:', error);
      toast.error('Erro ao buscar histórico de transferências');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || amount <= 0 || (modalAction === 'transfer' && !receiverEmail)) {
      toast.error('Todos os campos são obrigatórios');
      return;
    }

    try {
      const endpoint =
        modalAction === 'deposit'
          ? '/api/transfers/deposit'
          : modalAction === 'withdraw'
          ? '/api/transfers/withdraw'
          : '/api/transfers/transfer';

      const payload =
        modalAction === 'transfer'
          ? { senderId: authUser._id, receiverEmail, amount }
          : { userId: authUser._id, amount };

      const response = await axios.post(endpoint, payload);
      toast.success(response.data.message);

      setAuthUser((prev) => ({ ...prev, balance: response.data.newBalance }));
      if (socket) {
        socket.emit('updateBalance', authUser._id, response.data.newBalance);
      }
      
      setShowModal(false);
      setReceiverEmail('');
      setAmount('');
      fetchTransferHistory();
    } catch (error) {
      console.error('Erro ao processar operação:', error);
      toast.error(error.response?.data?.error || 'Erro ao processar a operação');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-800">Minha Conta</h1>

        <div className="bg-blue-500 p-6 rounded-lg text-white text-center">
          <p className="text-lg">Saldo Atual</p>
          <p className="text-4xl font-semibold">{authUser?.balance?.toFixed(2)} <span className="text-sm">EUR</span></p>
        </div>

        <button onClick={() => { setModalAction('deposit'); setShowModal(true); }} className="btn bg-blue-500 text-white w-full">Depositar</button>
        <button onClick={() => { setModalAction('transfer'); setShowModal(true); }} className="btn bg-blue-500 text-white w-full">Transferir</button>
        <button onClick={() => { setModalAction('withdraw'); setShowModal(true); }} className="btn bg-blue-500 text-white w-full">Sacar</button>
      </div>
    </div>
  );
};

export default AccountPage;
