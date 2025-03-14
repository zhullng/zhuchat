import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, Edit2, ShieldCheck } from "lucide-react";

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

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar email
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setErrors({ email: "Formato de email inválido" });
      return;
    }

    try {
      const result = await updateProfile(formData);
      if (result?.errors) {
        setErrors(result.errors);
      } else {
        setIsModalOpen(false);
        setErrors({});
      }
    } catch (error) {
      console.error("Erro na atualização:", error);
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
                <h3 className="text-lg font-semibold mb-4">Editar Perfil</h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">
                      <span className="label-text">Nome Completo</span>
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({...prev, fullName: e.target.value}))}
                      className="input input-bordered w-full"
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text">Email</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
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
                      onChange={(e) => setFormData(prev => ({...prev, gender: e.target.value}))}
                      className="select select-bordered w-full"
                    >
                      <option value="">Não especificado</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setErrors({});
                      }}
                      className="btn btn-ghost"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isUpdatingProfile}
                    >
                      {isUpdatingProfile ? 'Salvando...' : 'Salvar Alterações'}
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