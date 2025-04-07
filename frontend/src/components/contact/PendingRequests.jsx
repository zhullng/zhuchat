import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { Check, XCircle } from "lucide-react";

const PendingRequests = ({ onRequestResponded }) => {
  const { getPendingRequests, respondToRequest } = useChatStore();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState([]);

  const fetchPendingRequests = async () => {
    setIsLoading(true);
    try {
      const requests = await getPendingRequests();
      setPendingRequests(Array.isArray(requests) ? requests : []);
    } catch (error) {
      console.error("Erro ao obter pedidos pendentes:", error);
      setPendingRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchPendingRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleResponse = async (contactId, status) => {
    setProcessingIds(prev => [...prev, contactId]);
    
    try {
      await respondToRequest(contactId, status);
      fetchPendingRequests();
      
      toast.success(status === "accepted" 
        ? "Pedido de contacto aceite" 
        : "Pedido de contacto rejeitado"
      );
      
      if (onRequestResponded) {
        onRequestResponded();
      }
    } catch (error) {
      console.error("Erro ao responder ao pedido:", error);
      toast.error("Ocorreu um erro ao responder ao pedido de contacto.");
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== contactId));
    }
  };

  if (pendingRequests.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium mb-2">Pedidos de Contacto ({pendingRequests.length})</h3>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {pendingRequests.map(request => {
          const isProcessing = processingIds.includes(request._id);
          
          return (
            <div key={request._id} className="flex items-center justify-between bg-base-200 p-2 rounded-lg">
              <div className="flex items-center gap-2">
                <img 
                  src={request.userId?.profilePic || "/avatar.png"} 
                  alt={request.userId?.fullName || "Utilizador"}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <div className="font-medium text-sm">{request.userId?.fullName || "Utilizador"}</div>
                  <div className="text-xs text-base-content/70">{request.userId?.email || ""}</div>
                </div>
              </div>
              
              <div className="flex gap-1">
                <button 
                  onClick={() => !isProcessing && handleResponse(request._id, "accepted")}
                  className="btn btn-xs btn-success"
                  title="Aceitar"
                  disabled={isProcessing}
                >
                  <Check size={14} />
                </button>
                
                <button 
                  onClick={() => !isProcessing && handleResponse(request._id, "rejected")}
                  className="btn btn-xs btn-error"  
                  title="Rejeitar"
                  disabled={isProcessing}
                >
                  <XCircle size={14} />
                </button>
              </div>
            </div>
          );
        })}
        
        {isLoading && pendingRequests.length === 0 && (
          <div className="text-center py-2 text-base-content/70">
            A carregar pedidos...
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingRequests;