// TransfersPage.jsx
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const TransfersPage = () => {
  const [transfers, setTransfers] = useState([]);
  const { authUser } = useAuthStore();

  useEffect(() => {
    const fetchTransferHistory = async () => {
      try {
        const response = await axios.get(`/api/transfers/history/${authUser?._id}`);
        // Garante que a resposta seja um array antes de definir o estado
        setTransfers(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        toast.error('Erro ao buscar histórico de transferências');
        setTransfers([]); // Garante que não fique indefinido
      }
    };

    if (authUser?._id) {
      fetchTransferHistory();
    }
  }, [authUser]);

  return (
    <div className='max-w-5xl mx-auto p-6'>
      <h1 className='text-3xl font-semibold text-center mb-6'>Histórico de Transferências</h1>

      <div className='overflow-x-auto'>
        <table className='table table-zebra w-full'>
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
              <tr><td colSpan="5" className="text-center">Sem transferências</td></tr>
            ) : (
              transfers.map((transfer) => (
                <tr key={transfer._id}>
                  <td>{new Date(transfer.createdAt).toLocaleDateString()}</td>
                  <td>{transfer.sender?.fullName || 'Desconhecido'}</td>
                  <td>{transfer.receiver?.fullName || 'Desconhecido'}</td>
                  <td>R$ {parseFloat(transfer.amount).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${transfer.status === 'Completed' ? 'badge-success' : 'badge-error'}`}>
                      {transfer.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransfersPage;
