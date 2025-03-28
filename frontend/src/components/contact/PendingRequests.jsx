// components/contact/PendingRequests.jsx
import { useState, useEffect } from "react";
import { axiosInstance } from "../../lib/axios";
import toast from "react-hot-toast";

const PendingRequests = ({ onRequestResponded }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPendingRequests = async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get("/api/contacts/pending");
      setPendingRequests(res.data);
    } catch (error) {
      console.error("Erro ao obter pedidos pendentes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const handleResponse = async (contactId, status) => {
    try {
      await axiosInstance.patch(`/api/contacts/${contactId}/respond`, { status });
      toast.success(status === "accepted" 
        ? "Pedido de contacto aceite" 
        : "Pedido de contacto rejeitado"
      );
      
      // Atualizar a lista de pedidos
      fetchPendingRequests();
      
      if (onRequestResponded) {
        onRequestResponded();
      }
    } catch (error) {
      toast.error("Erro ao processar o pedido de contacto");
    }
  };

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium mb-2">Pedidos de Contacto ({pendingRequests.length})</h3>
      
      <div className="space-y-2">
        {pendingRequests.map(request => (
          <div key={request._id} className="flex items-center justify-between bg-base-200 p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <img 
                src={request.userId.profilePic || "/avatar.png"} 
                alt={request.userId.fullName}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <div className="font-medium text-sm">{request.userId.fullName}</div>
                <div className="text-xs text-base-content/70">{request.userId.email}</div>
              </div>
            </div>
            
            <div className="flex gap-1">
              <button 
                onClick={() => handleResponse(request._id, "accepted")}
                className="btn btn-xs btn-success"
              >
                Aceitar
              </button>
              
              <button 
                onClick={() => handleResponse(request._id, "rejected")}
                className="btn btn-xs btn-error"
              >
                Rejeitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingRequests;