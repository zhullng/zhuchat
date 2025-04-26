import { useState } from "react";
import { axiosInstance } from "../../lib/axios";
import toast from "react-hot-toast";
import { useChatStore } from "../../store/useChatStore";

const AddContact = ({ onContactAdded }) => {
  const { getUsers } = useChatStore();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Por favor, introduza um email válido");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Enviar o pedido de contacto
      await axiosInstance.post("/api/contacts/add", { email });
      toast.success("Pedido de contacto enviado com sucesso");
      setEmail("");
      
      // Atualizar a lista de utilizadores imediatamente
      await getUsers();
      
      // Também chamar o callback, caso exista
      if (onContactAdded) {
        onContactAdded();
      }
    } catch (error) {
      // Mensagem de erro mais clara para o utilizador
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          "Erro ao adicionar contacto";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium mb-2">Adicionar Contacto</h3>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email do contacto"
          className="input input-bordered input-sm flex-grow"
          disabled={isLoading}
        />
        
        <button 
          type="submit" 
          className="btn btn-primary btn-sm"
          disabled={isLoading}
        >
          {isLoading ? "A adicionar..." : "Adicionar"}
        </button>
      </form>
    </div>
  );
};

export default AddContact;