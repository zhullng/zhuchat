import { useState } from "react";
import { axiosInstance } from "../../lib/axios";
import toast from "react-hot-toast";

const AddContact = ({ onContactAdded }) => {
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
      await axiosInstance.post("/api/contacts/add", { email });
      toast.success("Pedido de contacto enviado com sucesso");
      setEmail("");
      
      if (onContactAdded) {
        onContactAdded();
      }
    } catch (error) {
      // Mensagem de erro mais clara para o utilizador
      const errorMessage = error.response?.data?.error || "Erro ao adicionar contacto";
      toast.error(errorMessage);
      
      // Se o erro for de bloqueio ou rejeição, podemos exibir uma mensagem mais específica
      if (errorMessage.includes("bloqueado") || errorMessage.includes("rejeitado")) {
        toast("Tente novamente mais tarde ou contacte o utilizador por outros meios.", {
          icon: "ℹ️",
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-4">
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