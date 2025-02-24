import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import axios from "axios";
import { toast } from "react-hot-toast";

const CreateTransfersPage = () => {
  const [receiverEmail, setReceiverEmail] = useState('');
  const [amount, setAmount] = useState('');
  const { authUser } = useAuthStore();
  const navigate = useNavigate(); // Hook para navegação

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

      // Redireciona para a página de histórico de transferências após a criação
      navigate('/transfers');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro na transferência');
    }
  };

  return (
    <div>
      <h1>Fazer Transferência</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email do Destinatário:</label>
          <input
            type="email"
            value={receiverEmail}
            onChange={(e) => setReceiverEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Valor:</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="0.01"
            step="0.01"
          />
        </div>
        <button type="submit">Transferir</button>
      </form>
    </div>
  );
};

export default CreateTransfersPage;
