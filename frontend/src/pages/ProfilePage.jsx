import { useAuthStore } from "../store/useAuthStore";
import { Mail, User, ShieldCheck, Clock, Shield } from "lucide-react";

const ProfilePage = () => {
  const { authUser } = useAuthStore();

  return (
    <div className="h-screen pl-16 sm:pl-20 overflow-auto bg-base-100">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-200 rounded-xl p-6 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold">Perfil</h1>
            <p className="mt-2 text-base-content/70">Suas informações de perfil</p>
          </div>

          {/* Profile Image Section */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-32 h-32">
              <img
                src={authUser?.profilePic || "/avatar.png"}
                alt="Profile"
                className="w-full h-full rounded-full object-cover border-4 border-base-300"
              />
            </div>
          </div>

          {/* Profile Information */}
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
                  <p className="text-base-content/70 capitalize">
                    {authUser?.gender || "Não especificado"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information Section */}
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
                  {authUser?.createdAt 
                    ? new Date(authUser.createdAt).toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })
                    : "Data não disponível"
                  }
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
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;