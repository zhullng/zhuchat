// TransfersPage.jsx
import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const TransfersPage = () => {
  const [transfers, setTransfers] = useState([]);
  const { authUser } = useAuthStore();

  useEffect(() => {
    // Função para buscar histórico de transferências
    const fetchTransferHistory = async () => {
      try {
        const response = await axios.get(`/api/transfers/history/${authUser._id}`);
        setTransfers(response.data);
      } catch (error) {
        toast.error('Erro ao buscar histórico de transferências');
      }
    };

    if (authUser) {
      fetchTransferHistory();
    }
  }, [authUser]);

  return (
    <div>
      <h1>Histórico de Transferências</h1>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Remetente</th>
            <th>Destinatário</th>
            <th>Valor</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {transfers.length === 0 ? (
            <tr><td colSpan="5">Sem transferências</td></tr>
          ) : (
            transfers.map((transfer) => (
              <tr key={transfer._id}>
                <td>{new Date(transfer.createdAt).toLocaleDateString()}</td>
                <td>{transfer.sender.fullName}</td>
                <td>{transfer.receiver.fullName}</td>
                <td>{transfer.amount}</td>
                <td>{transfer.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TransfersPage;
