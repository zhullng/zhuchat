import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const AccountPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [amount, setAmount] = useState('');
  const { authUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTransferHistory();
  }, []);

  const fetchTransferHistory = async () => {
    try {
      const response = await axios.get(`/api/transfers/history/${authUser._id}`);
      setTransfers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error('Erro ao buscar histórico de transferências');
      setTransfers([]);
    }
  };

  const validateEmail = (email) => {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0 || (modalAction === 'transfer' && !receiverEmail)) {
      toast.error('Todos os campos são obrigatórios');
      return;
    }

    if (modalAction === 'transfer' && !validateEmail(receiverEmail)) {
      toast.error('Formato de e-mail inválido!');
      return;
    }

    try {
      const endpoint = modalAction === 'deposit' ? '/api/deposit' : modalAction === 'withdraw' ? '/api/withdraw' : '/api/transfers';
      const payload = modalAction === 'transfer' 
        ? { senderId: authUser._id, receiverEmail, amount }
        : { userId: authUser._id, amount };

      const response = await axios.post(endpoint, payload);
      toast.success(response.data.message);
      setReceiverEmail('');
      setAmount('');
      setShowModal(false);
      fetchTransferHistory();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao processar a operação');
    }
  };

  const handleModalAction = (action) => {
    setModalAction(action);
    setShowModal(true);
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <button onClick={() => navigate('/')} className="text-primary">&larr; Voltar</button>
      <h1 className="text-2xl font-bold">Minha Conta</h1>

      <div className="bg-base-200 p-4 rounded-lg">
        <p className="text-base-content">Saldo Atual</p>
        <p className="text-3xl font-semibold">${authUser?.balance?.toFixed(2)}</p>
      </div>

      <div className="flex space-x-4">
        <button onClick={() => handleModalAction('deposit')} className="btn btn-success">Depositar</button>
        <button onClick={() => handleModalAction('transfer')} className="btn btn-primary">Transferir</button>
        <button onClick={() => handleModalAction('withdraw')} className="btn btn-error">Sacar</button>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md">
            <h2 className="text-2xl font-semibold mb-4">
              {modalAction === 'deposit' ? 'Depositar' : modalAction === 'transfer' ? 'Transferir' : 'Sacar'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {modalAction === 'transfer' && (
                <div>
                  <label htmlFor="receiverEmail" className="block text-sm font-medium">E-mail do Destinatário</label>
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
                  {modalAction === 'deposit' ? 'Depositar' : modalAction === 'transfer' ? 'Transferir' : 'Sacar'}
                </button>
              </div>
            </form>

            <button onClick={() => setShowModal(false)} className="mt-4 btn btn-ghost w-full">Cancelar</button>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold">Transações</h2>
      <div className="space-y-2">
        {transfers.length === 0 ? (
          <p>Nenhuma transação encontrada</p>
        ) : (
          transfers.map((transfer) => (
            <div key={transfer._id} className="flex justify-between p-2 border-b">
              <div>
                <p className="font-medium">
                  {transfer.sender.fullName === authUser.fullName ? transfer.receiver.fullName : transfer.sender.fullName}
                </p>
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
