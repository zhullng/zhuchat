import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const AccountPage = () => {
  const [transfers, setTransfers] = useState([]); // Histórico de transferências
  const [showModal, setShowModal] = useState(false); // Controla a exibição do modal
  const [modalAction, setModalAction] = useState(''); // Ação atual do modal (depositar, transferir, sacar)
  const [receiverEmail, setReceiverEmail] = useState(''); // E-mail do destinatário para a transferência
  const [amount, setAmount] = useState(''); // Quantia a ser depositada/transferida/sacada
  const { authUser } = useAuthStore(); // Pega o usuário autenticado do estado global
  const navigate = useNavigate();

  // Validação de email
  const validateEmail = (email) => {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
  };

  // Função para carregar o histórico de transferências
  const fetchTransferHistory = async () => {
    try {
      const response = await axios.get(`/api/transfers/history/${authUser._id}`);
      setTransfers(response.data); // Atualiza o estado com as transferências
    } catch (error) {
      toast.error('Erro ao buscar histórico de transferências');
    }
  };

  // Função para submeter o formulário (depositar, transferir ou sacar)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || amount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    try {
      if (modalAction === 'deposit') {
        const response = await axios.post('/api/transfers/deposit', {
          userId: authUser._id,
          amount,
        });
        toast.success(response.data.message);
      } else if (modalAction === 'withdraw') {
        const response = await axios.post('/api/transfers/withdraw', {
          userId: authUser._id,
          amount,
        });
        toast.success(response.data.message);
      } else if (modalAction === 'transfer') {
        if (!receiverEmail || !validateEmail(receiverEmail)) {
          toast.error('Email inválido');
          return;
        }

        const response = await axios.post('/api/transfers', {
          senderId: authUser._id,
          receiverEmail,
          amount,
        });
        toast.success(response.data.message);
      }

      // Após a ação, reseta os campos
      setReceiverEmail('');
      setAmount('');
      setShowModal(false);
      fetchTransferHistory(); // Recarrega o histórico de transferências
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro na operação');
    }
  };

  // Função para controlar a ação do modal (depositar, transferir ou sacar)
  const handleModalAction = (action) => {
    setModalAction(action);
    setShowModal(true);
  };

  // Carrega o histórico de transferências quando o componente é montado
  useEffect(() => {
    if (authUser) {
      fetchTransferHistory();
    }
  }, [authUser]);

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <button onClick={() => navigate(-1)} className="text-primary">&larr; Back</button>
      <h1 className="text-2xl font-bold">My Account</h1>

      <div className="bg-base-200 p-4 rounded-lg">
        <p className="text-base-content">Current balance</p>
        <p className="text-3xl font-semibold">${authUser?.balance?.toFixed(2)}</p>
      </div>

      <div className="flex space-x-4">
        <button onClick={() => handleModalAction('deposit')} className="btn btn-success">Deposit</button>
        <button onClick={() => handleModalAction('transfer')} className="btn btn-primary">Transfer</button>
        <button onClick={() => handleModalAction('withdraw')} className="btn btn-error">Withdraw</button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md">
            <h2 className="text-2xl font-semibold mb-4">{modalAction === 'deposit' ? 'Deposit' : modalAction === 'transfer' ? 'Transfer' : 'Withdraw'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {modalAction === 'transfer' && (
                <>
                  <div>
                    <label htmlFor="receiverEmail" className="block text-sm font-medium">Email do Destinatário</label>
                    <input
                      type="email"
                      id="receiverEmail"
                      value={receiverEmail}
                      onChange={(e) => setReceiverEmail(e.target.value)}
                      className="input input-bordered w-full mt-2"
                      required
                      placeholder="Digite o e-mail do destinatário"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="amount" className="block text-sm font-medium">Valor</label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input input-bordered w-full mt-2"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="Digite o valor"
                />
              </div>

              <div className="flex justify-between">
                <button type="submit" className="btn btn-primary w-full py-3">
                  {modalAction === 'deposit' ? 'Deposit' : modalAction === 'transfer' ? 'Transfer' : 'Withdraw'}
                </button>
              </div>
            </form>

            <button onClick={() => setShowModal(false)} className="mt-4 btn btn-ghost w-full">
              Cancel
            </button>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold">Transactions</h2>
      <div className="space-y-2">
        {transfers.length === 0 ? (
          <p>No transactions found</p>
        ) : (
          transfers.map((transfer) => (
            <div key={transfer._id} className="flex justify-between p-2 border-b">
              <div>
                <p className="font-medium">{transfer.sender.fullName === authUser.fullName ? transfer.receiver.fullName : transfer.sender.fullName}</p>
                <p className="text-sm text-base-content">{new Date(transfer.createdAt).toLocaleDateString()}</p>
              </div>
              <p className={transfer.sender.fullName === authUser.fullName ? 'text-error' : 'text-success'}>
                {transfer.sender.fullName === authUser.fullName ? '-' : '+'}${transfer.amount.toFixed(2)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AccountPage;
