import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuthStore();
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false
  });

  // Validate password complexity
  const validatePassword = (password) => {
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/;
    return complexityRegex.test(password);
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    // Current password check
    if (!formData.currentPassword?.trim()) {
      newErrors.currentPassword = "Senha atual é obrigatória";
    }

    // New password checks
    if (!formData.newPassword?.trim()) {
      newErrors.newPassword = "Nova senha é obrigatória";
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = "Nova senha deve ter no mínimo 6 caracteres";
    } else if (!validatePassword(formData.newPassword)) {
      newErrors.newPassword = "Senha deve conter maiúsculas, minúsculas e números";
    }

    // Confirm new password check
    if (!formData.confirmNewPassword?.trim()) {
      newErrors.confirmNewPassword = "Confirmação de senha é obrigatória";
    } else if (formData.newPassword !== formData.confirmNewPassword) {
      newErrors.confirmNewPassword = "Senhas não coincidem";
    }

    // Prevent using the same password
    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = "Nova senha deve ser diferente da senha atual";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Call update password method from auth store
      const result = await updatePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      // Handle successful password change
      if (result.success) {
        toast.success("Senha atualizada com sucesso!");
        navigate('/settings');
      } else {
        // Handle specific error messages from backend
        const errorMessage = result.message || "Erro ao atualizar senha";
        toast.error(errorMessage);
        
        // Check for specific error scenarios
        if (errorMessage.includes('senha atual')) {
          setErrors(prev => ({
            ...prev, 
            currentPassword: "Senha atual incorreta"
          }));
        }
      }
    } catch (error) {
      console.error("Erro na atualização da senha:", error);
      toast.error("Erro ao atualizar senha. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="h-screen pl-16 sm:pl-20 overflow-auto bg-base-100">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <button 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-base-content/70 hover:text-base-content mb-4"
        >
          <ArrowLeft className="size-5" />
          <span>Voltar</span>
        </button>

        <div className="bg-base-200 rounded-xl p-6 shadow-lg">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <KeyRound className="size-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-semibold">Alterar Senha</h1>
            <p className="mt-2 text-base-content/70">Atualize sua senha de forma segura</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="label">
                <span className="label-text">Senha Atual</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword.currentPassword ? 'text' : 'password'}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  className={`
                    input input-bordered w-full 
                    ${errors.currentPassword ? 'input-error' : ''}
                  `}
                  placeholder="Digite sua senha atual"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('currentPassword')}
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-base-content/50"
                >
                  {showPassword.currentPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <span className="text-error text-sm mt-1">
                  {errors.currentPassword}
                </span>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="label">
                <span className="label-text">Nova Senha</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword.newPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className={`
                    input input-bordered w-full 
                    ${errors.newPassword ? 'input-error' : ''}
                  `}
                  placeholder="Digite sua nova senha"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('newPassword')}
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-base-content/50"
                >
                  {showPassword.newPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <span className="text-error text-sm mt-1">
                  {errors.newPassword}
                </span>
              )}
              <p className="text-xs text-base-content/70 mt-1">
                Sua senha deve conter: maiúsculas, minúsculas e números
              </p>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="label">
                <span className="label-text">Confirmar Nova Senha</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword.confirmNewPassword ? 'text' : 'password'}
                  name="confirmNewPassword"
                  value={formData.confirmNewPassword}
                  onChange={handleChange}
                  className={`
                    input input-bordered w-full 
                    ${errors.confirmNewPassword ? 'input-error' : ''}
                  `}
                  placeholder="Confirme sua nova senha"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirmNewPassword')}
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-base-content/50"
                >
                  {showPassword.confirmNewPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
              {errors.confirmNewPassword && (
                <span className="text-error text-sm mt-1">
                  {errors.confirmNewPassword}
                </span>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Atualizando...' : 'Alterar Senha'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;