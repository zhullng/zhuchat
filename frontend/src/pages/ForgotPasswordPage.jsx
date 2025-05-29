import { useState } from "react";
import { ArrowLeft, Loader2, Mail, Link as LinkIcon, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [devToken, setDevToken] = useState(null);
  const [showDevInfo, setShowDevInfo] = useState(true); // Sempre mostrar em desenvolvimento

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Por favor, insira o seu email");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error("Email inválido");
      return;
    }

    setIsSubmitting(true);
    setDevToken(null);

    try {
      const response = await axiosInstance.post("/auth/forgot-password", { email });
      
      setEmailSent(true);
      toast.success(response.data.message || "Email enviado com sucesso! Verifique a sua caixa de entrada.");
      
      // Capturar token de desenvolvimento, se disponível
      if (response.data._devToken) {
        console.log("Token de recuperação para desenvolvimento:", response.data._devToken);
        setDevToken(response.data._devToken);
        setShowDevInfo(true);
      }
    } catch (error) {
      console.error("Erro ao enviar email de recuperação:", error);
      const errorMessage = error.response?.data?.message || "Não foi possível enviar o email de recuperação";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevTokenClick = () => {
    if (devToken) {
      navigate(`/reset-password/${devToken}`);
    }
  };

  const handleCopyResetLink = () => {
    if (devToken) {
      const resetUrl = `${window.location.origin}/reset-password/${devToken}`;
      navigator.clipboard.writeText(resetUrl)
        .then(() => toast.success("Link copiado para a área de transferência"))
        .catch(err => toast.error("Erro ao copiar link"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
      <div className="max-w-md w-full bg-base-200 p-8 rounded-xl shadow-lg">
        <div className="mb-6">
          <Link to="/login" className="flex items-center gap-2 text-base-content/70 hover:text-base-content">
            <ArrowLeft className="size-5" />
            <span>Voltar para login</span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Recuperar Palavra-passe</h1>
          {!emailSent ? (
            <p className="mt-2 text-base-content/70">
              Insira o seu email e enviaremos um link para recuperar a sua palavra-passe
            </p>
          ) : (
            <p className="mt-2 text-base-content/70">
              Verifique o seu email. Enviámos um link para recuperar a sua palavra-passe
            </p>
          )}
        </div>

        {!emailSent ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="size-5 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className="input input-bordered w-full pl-10"
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  A enviar...
                </>
              ) : (
                "Enviar Link de Recuperação"
              )}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="p-4 bg-success/10 text-success rounded-lg">
              <p>Email enviado com sucesso!</p>
            </div>
            
            {/* Informações de desenvolvedor - link direto para redefinição */}
            {devToken && (
              <div className={`mt-6 p-4 border border-warning rounded-lg ${showDevInfo ? 'block' : 'hidden'}`}>
                <h3 className="font-bold text-warning mb-2">Modo de Desenvolvimento</h3>
                <p className="text-sm mb-3">Como o envio de email pode não estar configurado corretamente, Eu pode usar estas opções para testar:</p>
                
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={handleDevTokenClick}
                    className="btn btn-warning btn-sm gap-2 w-full"
                  >
                    <LinkIcon className="size-4" />
                    Ir para página de redefinição
                  </button>
                  
                  <button 
                    onClick={handleCopyResetLink}
                    className="btn btn-outline btn-warning btn-sm gap-2 w-full"
                  >
                    <ExternalLink className="size-4" />
                    Copiar link para dispositivo móvel
                  </button>
                </div>
                
                <div className="mt-3 overflow-x-auto">
                  <code className="text-xs block bg-base-300 p-2 rounded text-left whitespace-normal break-all">
                    {window.location.origin}/reset-password/{devToken}
                  </code>
                </div>
                
                <p className="text-xs mt-3 text-base-content/60">
                  Este link não é mostrado em produção e é apenas para fins de desenvolvimento.
                </p>
              </div>
            )}
            
            <div>
              <button 
                onClick={() => {
                  setEmailSent(false);
                  setDevToken(null);
                }}
                className="btn btn-outline w-full"
              >
                Tentar com outro email
              </button>
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <p className="text-base-content/60 text-sm">
            Lembrou-se da sua palavra-passe?{" "}
            <Link to="/login" className="link link-primary">
              Iniciar sessão
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;