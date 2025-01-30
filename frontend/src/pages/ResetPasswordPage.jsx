import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { axiosInstance } from "../lib/axios";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    try {
      const response = await axiosInstance.post("/auth/reset-password", {
        token,
        newPassword,
      });

      if (response.status === 200) {
        setSuccess("Senha redefinida com sucesso!");
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      setError("Erro ao redefinir senha. Tente novamente.");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="bg-base-300 rounded-xl p-6 space-y-6 max-w-md w-full">
        <h1 className="text-2xl font-semibold text-center">Redefinir Senha</h1>
        <div className="space-y-4">
          <input
            type="password"
            placeholder="Nova Senha"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 bg-base-200 rounded-lg border"
          />
          <input
            type="password"
            placeholder="Confirmar Nova Senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 bg-base-200 rounded-lg border"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-500 text-sm">{success}</p>}
          <button
            onClick={handleResetPassword}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Redefinir Senha
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;