import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore"; // Importa o estado da autenticação do user
import AuthImagePattern from "../components/AuthImagePattern"; // Componente de imagem para a página de login
import { Link } from "react-router-dom"; // Para navegação entre páginas
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare } from "lucide-react"; // Importa os ícones

const LoginPage = () => {
  // Controlar se a pass será visível ou oculta
  const [showPassword, setShowPassword] = useState(false);

  // Estado para armazenar os dados do formulário de login (email e palavra-passe)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Função de login vinda do store de autenticação
  const { login, isLoggingIn } = useAuthStore();

  // Função para lidar com o envio do formulário
  const handleSubmit = async (e) => {
    e.preventDefault(); // Previne o comportamento padrão de envio do formulário
    login(formData); // Chama a função de login com os dados do formulário
  };

  return (
    <div className="h-screen grid lg:grid-cols-2">
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div
                className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20
              transition-colors"
              >
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Welcome Back</h1>
              <p className="text-base-content/60">Sign in to your account</p>
            </div>
          </div>

          {/* Formulário de Login */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo de Email */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className={`input input-bordered w-full pl-10`}
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Campo de pass */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? "text" : "password"} // Alterar tipo de input dependendo do estado de visibilidade da pass
                  className={`input input-bordered w-full pl-10`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                {/* Botão para mostrar ou nao a pass */}
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)} // Altera o estado de visibilidade da pass
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-base-content/40" />
                  ) : (
                    <Eye className="h-5 w-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            {/* Botão de envio do formulário */}
            <button type="submit" className="btn btn-primary w-full" disabled={isLoggingIn}>
              {/* Se está a fazer login, mostra o ícone de refresh */}
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Sign in" // Caso contrário, mostra "Sign in"
              )}
            </button>
          </form>

          {/* Link para a página de criação de conta */}
          <div className="text-center">
            <p className="text-base-content/60">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="link link-primary">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Lado Direito - Imagem/Padrão */}
      <AuthImagePattern
        title={"Welcome back!"}
        subtitle={"Sign in to continue your conversations and catch up with your messages."}
      />
    </div>
  );
};

export default LoginPage;
