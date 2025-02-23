import React from 'react';
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, Settings, MessageCircle, CreditCard } from "lucide-react"; // Importando o ícone de cartão de crédito

const Navbar = () => {
  const { logout, authUser } = useAuthStore();

  return (
    <header className="border-r fixed top-0 left-0 z-40 w-16 sm:w-20 md:w-20 h-full bg-base-200">
      <div className="flex flex-col items-center justify-between p-4 h-full">
        {/* Top section */}
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col gap-4">
            <Link to="/" className="btn btn-circle btn-ghost btn-lg">
              <MessageCircle className="size-6" />
            </Link>
          </div>
        </div>

        {/* Bottom section */}
        <div className="flex flex-col gap-4">
          {authUser && (
            <>
              {/* Novo botão de pagamento */}
              <Link to="/payment" className="btn btn-circle btn-ghost btn-lg">
                <CreditCard className="size-6" /> {/* Ícone de pagamento */}
              </Link>

              {/* Botão de configurações */}
              <Link to="/settings" className="btn btn-circle btn-ghost btn-lg">
                <Settings className="size-6" />
              </Link>

              {/* Perfil do usuário */}
              <Link to="/profile" className="btn btn-circle btn-ghost btn-lg">
                <img
                  src={authUser.profilePic || "/avatar.png"}
                  alt="Profile"
                  className="size-12 rounded-full object-cover"
                />
              </Link>

              {/* Botão de logout */}
              <button 
                onClick={logout}
                className="btn btn-circle btn-ghost btn-lg"
              >
                <LogOut className="size-6" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
