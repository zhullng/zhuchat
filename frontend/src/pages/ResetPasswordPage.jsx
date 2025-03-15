import { useState, useEffect } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Shield } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  // Verificar se o token é válido
  useEffect(() => {
    const verifyToken = async () => {
      try {
        await axiosInstance.get(`/auth/reset-password/${token}`);
        setIsValidToken(true);
      } catch (error) {
        console.error("Token inválido ou expirado:", error);
        toast.error("Este link é inválido ou expirou. Por favor, solicite um novo link.");
        setIsValidToken(false);
      } finally {
        setIsCheckingToken(false);
      }
    };

    if (token) {
      verifyToken();
    } else {
      setIsValidToken(false);
      setIsCheckingToken(false);
    }
  }, [token]);

  const validatePassword = (password) => {
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/;
    return complexityRegex.test(password);
  };

  const validateForm = () => {
    if (!formData.password) {
      toast.error("Nova palavra-passe é obrigatória");
      return false;
    }

    if (formData.password.length < 6) {
      toast.error("A palavra-passe deve ter pelo menos 6 caracteres");
      return false;
    }

    if (!validatePassword(formData.password)) {
      toast.error("A palavra-passe deve conter letras maiúsculas, minúsculas e números");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("As palavras-passe não coincidem");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axiosInstance.post(`/auth/reset-password/${token}`, {
        password: formData.password
      });

      toast.success(response.data.message || "Palavra-passe redefinida com sucesso!");
      
      // Redirecionar para a página de login após redefinir a senha
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      console.error("Erro ao redefinir palavra-passe:", error);
      const errorMessage = error.response?.data?.message || "Não foi possível redefinir a palavra-passe";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="text-center">
          <Loader2 className="size-10 animate-spin mx-auto mb-4 text-primary" />
          <p>A verificar o link de recuperação...</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
        <div className="max-w-md w-full bg-base-200 p-8 rounded-xl shadow-lg text-center">
          <Shield className="size-16 text-error mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Link Inválido</h1>
          <p className="text-base-content/70 mb-6">
            Este link de recuperação é inválido ou expirou.
          </p>
          <Link to="/forgot-password" className="btn btn-primary w-full">
            Solicitar Novo Link
          </Link>
        </div>
      </div>
    );
  }

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
          <Shield className="size-16 text-primary mx-auto mb-2" />
          <h1 className="text-2xl font-bold">Redefinir Palavra-passe</h1>
          <p className="mt-2 text-base-content/70">
            Crie uma nova palavra-passe para a sua conta
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Nova Palavra-passe</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="size-5 text-base-content/40" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                className="input input-bordered w-full pl-10"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="size-5 text-base-content/40" />
                ) : (
                  <Eye className="size-5 text-base-content/40" />
                )}
              </button>
            </div>
            <label className="label">
              <span className="label-text-alt text-base-content/70">
                Mínimo 6 caracteres, incluindo maiúsculas, minúsculas e números
              </span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Confirmar Palavra-passe</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="size-5 text-base-content/40" />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="input input-bordered w-full pl-10"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-5 text-base-content/40" />
                ) : (
                  <Eye className="size-5 text-base-content/40" />
                )}
              </button>
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
                A redefinir...
              </>
            ) : (
              "Redefinir Palavra-passe"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;