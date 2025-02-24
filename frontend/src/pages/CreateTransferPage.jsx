import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import axios from "axios";
import { toast } from "react-hot-toast";

const CreateTransfersPage = () => {
  const [receiverEmail, setReceiverEmail] = useState('');
  const [amount, setAmount] = useState('');
  const { authUser } = useAuthStore();
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!receiverEmail || !amount) {
      toast.error('Todos os campos são obrigatórios');
      return;
    }

    if (!validateEmail(receiverEmail)) {
      toast.error('Formato de e-mail inválido!');
      return;
    }

    try {
      const response = await axios.post('/api/transfers', {
        senderId: authUser._id,
        receiverEmail,
        amount,
      });

      toast.success(response.data.message);
      setReceiverEmail('');
      setAmount('');

      navigate('/transfers');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro na transferência');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-semibold text-center mb-6">Fazer Transferência</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
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
          <button type="submit" className="btn btn-primary w-full py-3">Transferir</button>
        </div>
      </form>
    </div>
  );
};

export default CreateTransfersPage;
