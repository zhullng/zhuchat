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
      // Preparar dados para atualização
      const updatedFields = {};
      
      // Verificar e incluir apenas campos que foram modificados
      if (formData.fullName?.trim() !== authUser.fullName) {
        updatedFields.fullName = formData.fullName.trim();
      }
      
      if (formData.email?.trim() !== authUser.email) {
        updatedFields.email = formData.email.trim();
      }
      
      if (formData.gender !== authUser.gender) {
        updatedFields.gender = formData.gender;
      }

      // Se não houver alterações, fechar o modal
      if (Object.keys(updatedFields).length === 0) {
        toast.info("Nenhuma alteração detectada");
        setIsModalOpen(false);
        return;
      }

      // Fazer a atualização em uma única chamada
      const result = await updateProfile(updatedFields);

      if (result?.errors) {
        setErrors(result.errors);
        Object.values(result.errors).forEach(error => toast.error(error));
        return;
      }

      toast.success("Perfil atualizado com sucesso!");
      setIsModalOpen(false);
      setErrors({});

    } catch (error) {
      console.error("Erro na atualização:", error);
      toast.error("Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen pl-16 sm:pl-20 overflow-auto bg-base-100">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-200 rounded-xl p-6 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold">Perfil</h1>
            <p className="mt-2 text-base-content/70">Suas informações de perfil</p>
          </div>

          {/* Seção da imagem de perfil */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="relative">
              <img
                src={selectedImg || authUser?.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 rounded-full object-cover border-4 border-base-300"
              />
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute bottom-0 right-0 
                  bg-primary hover:bg-primary-focus
                  p-2 rounded-full cursor-pointer 
                  transition-all duration-200 shadow-lg
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}`}
              >
                <Camera className="size-5 text-base-100" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
          </div>

          {/* Informações do Perfil */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between p-4 bg-base-300 rounded-lg">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Nome</p>
                  <p className="text-base-content/70">{authUser?.fullName}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-base-300 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-base-content/70">{authUser?.email}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-base-300 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Género</p>
                  <p className="text-base-content/70 capitalize">{authUser?.gender || "Não especificado"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Seção de informações da conta */}
          <div className="bg-base-300 rounded-lg p-4 mb-8">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              Informações da Conta
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-base-content/10">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-primary/70" />
                  <span className="text-sm">Membro desde</span>
                </div>
                <span className="text-sm font-medium">
                  {new Date(authUser?.createdAt).toLocaleDateString('pt-PT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-primary/70" />
                  <span className="text-sm">Status da Conta</span>
                </div>
                <span className="text-sm font-medium text-green-500">Ativa</span>
              </div>
            </div>
          </div>

          {/* Botão de Editar */}
          <div className="flex justify-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary gap-2"
            >
              <Edit2 className="size-5" />
              Editar Perfil
            </button>
          </div>

          {/* Modal de Edição */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-base-100 rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Editar Perfil</h3>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setErrors({});
                      setFormData({
                        fullName: authUser.fullName || "",
                        email: authUser.email || "",
                        gender: authUser.gender || ""
                      });
                    }}
                    className="btn btn-ghost btn-sm btn-circle"
                  >
                    ✕
                  </button>
                </div>
                
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