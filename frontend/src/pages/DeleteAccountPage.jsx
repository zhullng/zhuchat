import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const DeleteAccountPage = () => {
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { authUser, deleteAccount } = useAuthStore();

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAccount();
      if (result.success) {
        navigate('/login');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-screen pl-16 sm:pl-20 overflow-auto bg-base-100">
      <div className="max-w-md mx-auto p-4 py-8">
        <div className="bg-base-200 rounded-xl p-6 shadow-lg">
          <div className="mb-6">
            <Link to="/settings" className="flex items-center gap-2 text-base-content/70 hover:text-base-content">
              <ArrowLeft className="size-5" />
              <span>Voltar para configurações</span>
            </Link>
          </div>

          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-error/10 rounded-full">
                <Trash2 className="size-10 text-error" />
              </div>
            </div>
            <h1 className="text-2xl font-semibold">Eliminar Conta</h1>
            <p className="mt-2 text-base-content/70">
              {!showConfirmation
                ? "Tem certeza que deseja eliminar sua conta? Esta ação é irreversível."
                : `Está prestes a eliminar permanentemente a sua conta (${authUser?.email})`}
            </p>
          </div>

          <div className="bg-warning/10 text-warning rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertTriangle className="size-6 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Esta ação é irreversível</h3>
                <p className="text-sm">
                  Todos os seus dados, conversas, contactos e informações pessoais serão 
                  permanentemente eliminados.
                </p>
              </div>
            </div>
          </div>

          {!showConfirmation ? (
            <div className="space-y-4">
              <button
                onClick={() => setShowConfirmation(true)}
                className="btn btn-error w-full"
              >
                <Trash2 className="size-5" />
                Quero eliminar a minha conta
              </button>

              <Link to="/settings" className="btn btn-outline w-full">
                Cancelar
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center mb-4">
                Esta ação <strong>não pode ser desfeita</strong>. Todos os seus dados serão excluídos permanentemente.
              </p>

              <button
                onClick={handleDeleteAccount}
                className="btn btn-error w-full"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    A processar...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-5" />
                    Eliminar Permanentemente
                  </>
                )}
              </button>

              <button
                onClick={() => setShowConfirmation(false)}
                className="btn btn-outline w-full"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountPage;