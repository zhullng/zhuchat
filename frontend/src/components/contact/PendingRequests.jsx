import { useState, useEffect, useCallback } from "react";
import { axiosInstance } from "../../lib/axios";
import toast from "react-hot-toast";
import { Check, XCircle } from "lucide-react";

const PendingRequests = ({ onRequestResponded }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState([]); // Para rastrear quais solicitações estão sendo processadas

  // Use useCallback to memoize the fetch function
  const fetchPendingRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get("/api/contacts/pending");
      
      // Ensure we're handling the response correctly
      const requestsData = res.data || [];
      
      // Validate the structure of the data
      const validatedRequests = requestsData.filter(request => 
        request && request._id && request.userId
      );
      
      setPendingRequests(validatedRequests);
    } catch (error) {
      console.error("Erro detalhado ao obter pedidos pendentes:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // More specific error handling
      const errorMessage = error.response?.data?.error || 
        "Não foi possível carregar os pedidos pendentes. Verifique sua conexão.";
      
      toast.error(errorMessage);
      setPendingRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array as it doesn't depend on external state

  // Use useEffect with the memoized callback
  useEffect(() => {
    fetchPendingRequests();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchPendingRequests, 30000);
    
    // Cleanup function
    return () => {
      clearInterval(interval);
    };
  }, [fetchPendingRequests]);

  const handleResponse = async (contactId, status) => {
    // Validar o ID do contacto
    if (!contactId) {
      toast.error("ID de contacto inválido");
      return;
    }
    
    // Adicionar o ID da solicitação à lista de processando
    setProcessingIds(prev => [...prev, contactId]);
    
    try {
      const response = await axiosInstance.patch(`/api/contacts/${contactId}/respond`, { status });
      
      // Atualizar a lista de pedidos removendo o que foi processado
      setPendingRequests(prev => prev.filter(request => request._id !== contactId));
      
      toast.success(status === "accepted" 
        ? "Pedido de contacto aceite" 
        : "Pedido de contacto rejeitado"
      );
      
      // Chamar o callback de resposta se fornecido
      if (onRequestResponded && typeof onRequestResponded === 'function') {
        onRequestResponded();
      }
    } catch (error) {
      console.error("Erro detalhado ao processar pedido:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMessage = error.response?.data?.error || 
        "Erro ao processar o pedido de contacto";
      
      toast.error(errorMessage);
    } finally {
      // Remover o ID da solicitação da lista de processando
      setProcessingIds(prev => prev.filter(id => id !== contactId));
    }
  };

  // Renderização condicional com mensagens de estado
  if (isLoading && pendingRequests.length === 0) {
    return (
      <div className="text-center py-2 text-base-content/70">
        A carregar pedidos...
      </div>
    );
  }

  if (!isLoading && pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium mb-2">Pedidos de Contacto ({pendingRequests.length})</h3>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {pendingRequests.map(request => {
          // Verificações adicionais de segurança
          if (!request || !request._id || !request.userId) {
            return null;
          }
          
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
      </div>
    </div>
  );
};

export default PendingRequests;