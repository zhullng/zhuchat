import { useState } from "react"; // Importa o hook useState do React para gerir o estado local
import { useAuthStore } from "../store/useAuthStore"; // Importa o estado da autenticação do user
import { Camera, Mail, User } from "lucide-react"; // Importa os ícones

const ProfilePage = () => {
  // Recebe os dados do user autenticado. se está a atualizar o perfil e a função para atualizar o perfil do store
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();

  // Estado local para armazenar a imagem selecionada para o perfil
  const [selectedImg, setSelectedImg] = useState(null);

  // Função para o envio do ficheiro de imagem
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; // Obtém o primeiro ficheiro selecionado
    if (!file) return; // Se não houver ficheiro selecionado, sai da função

    const reader = new FileReader(); // Cria uma nova instância de FileReader para ler o conteúdo do ficheiro

    reader.readAsDataURL(file); // Lê o ficheiro como um URL de dados (base64)

    // Quando o ficheiro for carregado com sucesso, atualiza a imagem do perfil
    reader.onload = async () => {
      const base64Image = reader.result; // A imagem em base64
      setSelectedImg(base64Image); // Atualiza a imagem selecionada no estado
      await updateProfile({ profilePic: base64Image }); // Atualiza o perfil com a nova imagem
    };
  };

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold ">Profile</h1>
            <p className="mt-2">Your profile information</p>
          </div>

          {/* Secção para atualizar a foto de perfil */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {/* Mostra a imagem de perfil, se existir, ou uma imagem padrão */}
              <img
                src={selectedImg || authUser.profilePic || "/avatar.png"} 
                alt="Profile"
                className="size-32 rounded-full object-cover border-4 "
              />
              {/* Botão para upload da imagem */}
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
                  className="hidden" // Esconde o input de ficheiro
                  accept="image/*" // Apenas permite imagens
                  onChange={handleImageUpload} // Função chamada quando o user seleciona uma imagem
                  disabled={isUpdatingProfile} // Desativa o botão enquanto está a ser feito o upload
                />
              </label>
            </div>
            <p className="text-sm text-zinc-400">
              {isUpdatingProfile ? "Uploading..." : "Click the camera icon to update your photo"}
            </p>
          </div>

          {/* Informações do perfil */}
          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{authUser?.fullName}</p>
            </div>
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{authUser?.email}</p>
            </div>
          </div>

          {/* Informações da conta */}
          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium  mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>{authUser.createdAt?.split("T")[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
