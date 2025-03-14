import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, Edit2, ShieldCheck, Clock, Shield } from "lucide-react";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    gender: ""
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authUser) {
      setFormData({
        fullName: authUser.fullName || "",
        email: authUser.email || "",
        gender: authUser.gender || ""
      });
    }
  }, [authUser]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = async () => {
        const base64Image = reader.result;
        setSelectedImg(base64Image);
        
        toast.promise(
          updateProfile({ profilePic: base64Image }),
          {
            loading: 'Atualizando foto...',
            success: 'Foto atualizada com sucesso!',
            error: 'Erro ao atualizar foto'
          }
        );
      };
    } catch (error) {
      console.error("Erro no upload da imagem:", error);
      toast.error("Erro ao processar a imagem");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName?.trim()) {
      newErrors.fullName = "Nome é obrigatório";
    }

    if (!formData.email?.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Criar objeto apenas com campos que foram modificados
      const updatedFields = {};
      
      if (formData.fullName !== authUser.fullName) {
        updatedFields.fullName = formData.fullName.trim();
      }
      
      if (formData.email !== authUser.email) {
        updatedFields.email = formData.email.trim();
      }
      
      if (formData.gender !== authUser.gender) {
        updatedFields.gender = formData.gender;
      }

      // Se não houver alterações, apenas fechar o modal
      if (Object.keys(updatedFields).length === 0) {
        setIsModalOpen(false);
        return;
      }

      const result = await updateProfile(updatedFields);
      
      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.errors) {
        setErrors(result.errors);
        return;
      }

      toast.success("Perfil atualizado com sucesso!");
      setIsModalOpen(false);
      setErrors({});

    } catch (error) {
      console.error("Erro na atualização:", error);
      toast.error(error.message || "Erro ao atualizar perfil");
    } finally {
      setIsSubmitting(false);
    }
  };

  // [... Resto do JSX permanece igual ...]

  return (
    <div className="h-screen pl-16 sm:pl-20 overflow-auto bg-base-100">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-200 rounded-xl p-6 shadow-lg">
          {/* ... Seções anteriores permanecem iguais ... */}

          {/* Modal de Edição */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-base-100 rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Editar Perfil</h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">
                      <span className="label-text">Nome Completo</span>
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData(prev => ({...prev, fullName: e.target.value}));
                        setErrors(prev => ({...prev, fullName: ""}));
                      }}
                      className={`input input-bordered w-full ${errors.fullName ? 'input-error' : ''}`}
                      placeholder="Seu nome completo"
                    />
                    {errors.fullName && (
                      <span className="text-error text-sm mt-1">{errors.fullName}</span>
                    )}
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text">Email</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData(prev => ({...prev, email: e.target.value}));
                        setErrors(prev => ({...prev, email: ""}));
                      }}
                      className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
                      placeholder="seu.email@exemplo.com"
                    />
                    {errors.email && (
                      <span className="text-error text-sm mt-1">{errors.email}</span>
                    )}
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text">Género</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => {
                        setFormData(prev => ({...prev, gender: e.target.value}));
                        setErrors(prev => ({...prev, gender: ""}));
                      }}
                      className={`select select-bordered w-full ${errors.gender ? 'select-error' : ''}`}
                    >
                      <option value="">Não especificado</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                    </select>
                    {errors.gender && (
                      <span className="text-error text-sm mt-1">{errors.gender}</span>
                    )}
                  </div>

                  {errors.submit && (
                    <div className="alert alert-error">
                      <span>{errors.submit}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setErrors({});
                        setFormData({
                          fullName: authUser.fullName || "",
                          email: authUser.email || "",
                          gender: authUser.gender || ""
                        });
                      }}
                      className="btn btn-ghost"
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;