import { useState, useEffect } from 'react';
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

  // Função para buscar o histórico de transferências do usuário
  const fetchTransferHistory = async (userId) => {
    try {
      const response = await axios.get(`/api/transfers/history/${userId}`);
      if (Array.isArray(response.data)) {
        setTransfers(response.data);
      } else {
        toast.error('Histórico de transferências não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de transferências:', error);
      toast.error('Erro ao buscar histórico de transferências');
    }
  };

  // Buscar o histórico sempre que o _id do authUser mudar
  useEffect(() => {
    if (authUser?._id) fetchTransferHistory(authUser._id);
  }, [authUser?._id]);

  // Função para validar se os dados da operação estão corretos
  const isValidOperation = () => {
    if (!amount || amount <= 0 || (modalAction === 'transfer' && !receiverEmail)) {
      toast.error('Todos os campos são obrigatórios e o valor deve ser maior que zero');
      return false;
    }
    return true;
  };

  // Função para processar a operação (depositar, sacar, transferir)
  const processOperation = async () => {
    if (!isValidOperation()) return;

    const endpoint = getEndpoint();
    const payload = getPayload();

    try {
      const response = await axios.post(endpoint, payload);
      toast.success(response.data.message);

      // Fechar o modal e limpar os campos
      setShowModal(false);
      setReceiverEmail('');
      setAmount('');

      // Atualizar o histórico e o saldo
      fetchTransferHistory(authUser._id); // Atualizar o histórico do sender
      if (modalAction === 'transfer') {
        // Atualizar o histórico do receiver também
        const receiverResponse = await axios.get(`/api/users/${receiverEmail}`);
        if (receiverResponse.data?._id) {
          fetchTransferHistory(receiverResponse.data._id); // Histórico do receiver
        }
      }

      // Atualizar o saldo
      updateBalance(response.data);
    } catch (error) {
      console.error('Erro ao processar operação:', error);
      toast.error(error.response?.data?.error || 'Erro ao processar a operação');
    }
  };

  // Função auxiliar para decidir o endpoint com base na ação
  const getEndpoint = () => {
    switch (modalAction) {
      case 'deposit': return '/api/transfers/deposit';
      case 'withdraw': return '/api/transfers/withdraw';
      case 'transfer': return '/api/transfers/transfer';
      default: return '';
    }
  };

  // Função auxiliar para criar o payload com base na ação
  const getPayload = () => {
    if (modalAction === 'transfer') {
      return { senderId: authUser._id, receiverEmail, amount };
    }
    return { userId: authUser._id, amount };
  };

  // Função para atualizar o saldo do usuário após a operação
  const updateBalance = (data) => {
    if (data.transfer) {
      setAuthUser({ ...authUser, balance: data.transfer.sender.balance });
    } else {
      setAuthUser({ ...authUser, balance: data.user.balance });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 pl-20 sm:pl-24 p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-800">Minha Conta</h1>

        <div className="bg-blue-500 p-6 rounded-lg text-white text-center">
          <p className="text-lg">Saldo Atual</p>
          <p className="text-4xl font-semibold">
            {authUser?.balance !== undefined ? (
              <>
                {authUser?.balance?.toFixed(2)} <span className="text-sm">EUR</span>
              </>
            ) : (
              'Carregando...'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button onClick={() => { setModalAction('deposit'); setShowModal(true); }} className="btn bg-blue-500 text-white w-full">
            Depositar
          </button>
          <button onClick={() => { setModalAction('transfer'); setShowModal(true); }} className="btn bg-blue-500 text-white w-full">
            Transferir
          </button>
          <button onClick={() => { setModalAction('withdraw'); setShowModal(true); }} className="btn bg-blue-500 text-white w-full">
            Sacar
          </button>
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
                      minute: '2-digit',
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
            <form onSubmit={(e) => { e.preventDefault(); processOperation(); }} className="space-y-4">
              {modalAction === 'transfer' && (
                <input type="email" placeholder="E-mail do destinatário" value={receiverEmail} onChange={(e) => setReceiverEmail(e.target.value)} className="input input-bordered w-full" required />
              )}
              <input type="number" placeholder="Valor" value={amount} onChange={(e) => setAmount(e.target.value)} className="input input-bordered w-full" required />
              <button type="submit" className="btn bg-blue-500 text-white w-full">Confirmar</button>
              <button type="button" onClick={() => { setShowModal(false); }} className="btn btn-ghost w-full">Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountPage;
