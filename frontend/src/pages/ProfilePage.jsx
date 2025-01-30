import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, Edit, Save, X, Lock, VenusMars } from "lucide-react";
import { axiosInstance } from "../lib/axios";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [editStates, setEditStates] = useState({
    fullName: false,
    email: false,
    gender: false,
  });
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    gender: "",
  });
  const [errors, setErrors] = useState({});
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [resetEmailStatus, setResetEmailStatus] = useState("");

  // Inicializa os dados do formulário com os valores do usuário autenticado
  useEffect(() => {
    if (authUser) {
      setFormData({
        fullName: authUser.fullName,
        email: authUser.email,
        gender: authUser.gender || "",
      });
    }
  }, [authUser]);

  // Função para upload da imagem de perfil
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

  // Função para atualizar os dados do perfil
  const handleUpdate = async (field) => {
    try {
      if (formData[field] === authUser[field]) {
        setEditStates((prev) => ({ ...prev, [field]: false }));
        return;
      }

      let error = null;
      if (field === "email" && !/\S+@\S+\.\S+/.test(formData.email)) {
        error = "Formato de email inválido";
      }

      if (error) {
        setErrors({ [field]: error });
        return;
      }

      const result = await updateProfile({ [field]: formData[field] });

      if (result?.errors) {
        setErrors(result.errors);
      } else {
        setEditStates((prev) => ({ ...prev, [field]: false }));
        setErrors({});
      }
    } catch (error) {
      console.error("Erro na atualização:", error);
    }
  };

  // Função para solicitar redefinição de senha
  const handleRequestPasswordReset = async () => {
    setIsSendingResetEmail(true);
    setResetEmailStatus("");
  
    try {
      const response = await axiosInstance.post("/auth/request-password-reset", {
        email: authUser.email,
      });
  
      if (response.status === 200) {
        setResetEmailStatus("E-mail de redefinição enviado com sucesso!");
      }
    } catch (error) {
      console.error("Erro completo:", error); // Log completo do erro
      const errorMessage = error.response?.data?.message || "Erro ao enviar e-mail. Tente novamente.";
      setResetEmailStatus(errorMessage);
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  // Função genérica para renderizar campos editáveis
  const renderEditableField = (field, label, icon) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-400 flex items-center gap-2">
          {icon}
          {label}
        </div>
        {!editStates[field] ? (
          <button
            onClick={() => setEditStates((prev) => ({ ...prev, [field]: true }))}
            className="text-sm text-primary flex items-center gap-1 hover:underline"
          >
            <Edit className="w-4 h-4" /> Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => handleUpdate(field)}
              className="text-sm text-green-500 flex items-center gap-1"
            >
              <Save className="w-4 h-4" /> Salvar
            </button>
            <button
              onClick={() => {
                setEditStates((prev) => ({ ...prev, [field]: false }));
                setFormData((prev) => ({ ...prev, [field]: authUser[field] }));
                setErrors({});
              }}
              className="text-sm text-red-500 flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        )}
      </div>

      {editStates[field] ? (
        <div className="relative">
          <input
            type="text"
            value={formData[field]}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, [field]: e.target.value }))
            }
            className={`w-full px-4 py-2.5 bg-base-200 rounded-lg border ${
              errors[field] ? "border-red-500 pr-20" : ""
            }`}
          />
          {errors[field] && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 text-sm">
              {errors[field]}
            </span>
          )}
        </div>
      ) : (
        <p className="px-4 py-2.5 bg-base-200 rounded-lg border">
          {authUser?.[field] || ""}
        </p>
      )}
    </div>
  );

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Perfil</h1>
            <p className="mt-2">Suas informações de perfil</p>
          </div>

          {/* Seção da imagem de perfil */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={selectedImg || authUser?.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 rounded-full object-cover border-4"
              />
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute bottom-0 right-0 
                  bg-base-content hover:scale-105
                  p-2 rounded-full cursor-pointer 
                  transition-all duration-200
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                `}
              >
                <Camera className="w-5 h-5 text-base-200" />
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
            <p className="text-sm text-zinc-400">
              {isUpdatingProfile
                ? "Enviando..."
                : "Clique no ícone da câmera para atualizar sua foto"}
            </p>
          </div>

          {/* Seção dos campos editáveis */}
          <div className="space-y-6">
            {renderEditableField("fullName", "Nome Completo", <User className="w-4 h-4" />)}
            {renderEditableField("email", "Endereço de Email", <Mail className="w-4 h-4" />)}

            {/* Campo de gênero */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400 flex items-center gap-2">
                  <VenusMars className="w-4 h-4" />
                  Género
                </div>
                {!editStates.gender ? (
                  <button
                    onClick={() => setEditStates((prev) => ({ ...prev, gender: true }))}
                    className="text-sm text-primary flex items-center gap-1 hover:underline"
                  >
                    <Edit className="w-4 h-4" /> Editar
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate("gender")}
                      className="text-sm text-green-500 flex items-center gap-1"
                    >
                      <Save className="w-4 h-4" /> Salvar
                    </button>
                    <button
                      onClick={() => {
                        setEditStates((prev) => ({ ...prev, gender: false }));
                        setFormData((prev) => ({ ...prev, gender: authUser?.gender }));
                      }}
                      className="text-sm text-red-500 flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                  </div>
                )}
              </div>

              {editStates.gender ? (
                <select
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, gender: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 bg-base-200 rounded-lg border"
                >
                  <option value="">Não especificado</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </select>
              ) : (
                <p className="px-4 py-2.5 bg-base-200 rounded-lg border capitalize">
                  {authUser?.gender || "Não especificado"}
                </p>
              )}
            </div>
          </div>

          {/* Seção de segurança */}
          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4">Segurança</h2>
            <div className="space-y-3 text-sm">
              <button
                onClick={handleRequestPasswordReset}
                disabled={isSendingResetEmail}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isSendingResetEmail ? (
                  <>
                    <Lock className="w-4 h-4 animate-spin" />
                    Enviando e-mail...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Redefinir Senha
                  </>
                )}
              </button>
              {resetEmailStatus && (
                <p className={`text-sm text-center mt-2 ${
                  resetEmailStatus.includes("sucesso") 
                    ? "text-green-500" 
                    : "text-red-500"
                }`}>
                  {resetEmailStatus}
                </p>
              )}
            </div>
          </div>

          {/* Seção de informações da conta */}
          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4">Informações da Conta</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Membro desde</span>
                <span>{new Date(authUser?.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Status da Conta</span>
                <span className="text-green-500">Ativa</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;