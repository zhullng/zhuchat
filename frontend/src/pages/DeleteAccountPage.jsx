import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Trash2, Loader2, Mail, Link as LinkIcon, ExternalLink, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const DeleteAccountPage = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [isConfirming, setIsConfirming] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [devToken, setDevToken] = useState(null);
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  
  const { 
    authUser, 
    isDeletingAccount, 
    requestAccountDeletion, 
    verifyDeleteToken, 
    confirmAccountDeletion
  } = useAuthStore();

  // Verificar token se estiver presente na URL
  useEffect(() => {
    const checkToken = async () => {
      if (token) {
        setIsConfirming(true);
        const result = await verifyDeleteToken(token);
        if (result.success) {
          setIsTokenValid(true);
          setUserEmail(result.email);
        } else {
          navigate('/security/delete-account');
        }
        setIsConfirming(false);
      }
    };

    checkToken();
  }, [token, verifyDeleteToken, navigate]);

  const handleRequestDeletion = async () => {
    setIsRequestingDeletion(true);
    try {
      const result = await requestAccountDeletion();
      if (result.success) {
        setEmailSent(true);
        
        // Capturar token para desenvolvimento
        if (result.data?._devToken) {
          setDevToken(result.data._devToken);
        }
      }
    } finally {
      setIsRequestingDeletion(false);
    }
  };

  const handleConfirmDeletion = async () => {
    setIsConfirming(true);
    try {
      const result = await confirmAccountDeletion(token);
      if (result.success) {
        navigate('/login');
      }
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDevTokenClick = () => {
    if (devToken) {
      navigate(`/security/delete-account/${devToken}`);
    }
  };

  const handleCopyDeleteLink = () => {
    if (devToken) {
      const deleteUrl = `${window.location.origin}/security/delete-account/${devToken}`;
      navigator.clipboard.writeText(deleteUrl)
        .then(() => toast.success("Link copiado para a área de transferência"))
        .catch(err => toast.error("Erro ao copiar link"));
    }
  };

  // Se o token é válido, mostrar a tela de confirmação de eliminação
  if (token && isTokenValid) {
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
              <h1 className="text-2xl font-semibold">Confirmar Eliminação</h1>
              <p className="mt-2 text-base-content/70">
                Está prestes a eliminar permanentemente a sua conta ({userEmail})
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

            <div className="space-y-4">
              <button
                onClick={handleConfirmDeletion}
                className="btn btn-error w-full"
                disabled={isConfirming}
              >
                {isConfirming ? (
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

              <Link to="/settings" className="btn btn-outline w-full">
                Cancelar
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela inicial para solicitar eliminação
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
              {!emailSent
                ? "Se pretende eliminar a sua conta, precisaremos de confirmar esta ação por email."
                : "Verifique o seu email para confirmar a eliminação da sua conta."}
            </p>
          </div>

          {!emailSent ? (
            <>
              <div className="bg-warning/10 text-warning rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <AlertTriangle className="size-6 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">Atenção!</h3>
                    <p className="text-sm">
                      A eliminação da sua conta é <strong>irreversível</strong>. Todos os seus 
                      dados, conversas, contactos e informações pessoais serão 
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
                    Tem certeza? Enviaremos um email para <strong>{authUser?.email}</strong> com 
                    instruções para confirmar a eliminação.
                  </p>

                  <button
                    onClick={handleRequestDeletion}
                    className="btn btn-error w-full"
                    disabled={isRequestingDeletion}
                  >
                    {isRequestingDeletion ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        A enviar...
                      </>
                    ) : (
                      <>
                        <Mail className="size-5" />
                        Enviar email de confirmação
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
            </>
          ) : (
            <div className="text-center space-y-6">
              <div className="p-4 bg-success/10 text-success rounded-lg">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <Check className="size-5" />
                  <p className="font-medium">Email enviado com sucesso!</p>
                </div>
                <p className="text-sm">
                  Verifique a sua caixa de entrada em <strong>{authUser?.email}</strong>
                </p>
              </div>
              
              {/* Informações de desenvolvedor - link direto para eliminação */}
              {devToken && (
                <div className="mt-6 p-4 border border-warning rounded-lg">
                  <h3 className="font-bold text-warning mb-2">Modo de Desenvolvimento</h3>
                  <p className="text-sm mb-3">
                    Como o envio de email pode não estar configurado corretamente, você pode usar estas opções para testar:
                  </p>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={handleDevTokenClick}
                      className="btn btn-warning btn-sm gap-2 w-full"
                    >
                      <LinkIcon className="size-4" />
                      Ir para página de eliminação
                    </button>
                    
                    <button 
                      onClick={handleCopyDeleteLink}
                      className="btn btn-outline btn-warning btn-sm gap-2 w-full"
                    >
                      <ExternalLink className="size-4" />
                      Copiar link para dispositivo móvel
                    </button>
                  </div>
                  
                  <div className="mt-3 overflow-x-auto">
                    <code className="text-xs block bg-base-300 p-2 rounded text-left whitespace-normal break-all">
                      {window.location.origin}/security/delete-account/{devToken}
                    </code>
                  </div>
                  
                  <p className="text-xs mt-3 text-base-content/60">
                    Este link não é mostrado em produção e é apenas para fins de desenvolvimento.
                  </p>
                </div>
              )}
              
              <div>
                <Link to="/settings" className="btn btn-outline w-full">
                  Voltar para configurações
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountPage;