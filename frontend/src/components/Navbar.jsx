import React, { useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, Settings, MessageCircle, CreditCard } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header
      className={`fixed top-0 left-0 z-40 h-full bg-base-200 transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-48' : 'w-16'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex flex-col items-center justify-between p-4 h-full">
        {/* Top section */}
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="flex flex-col gap-4 w-full">
            <Link to="/" className="btn btn-ghost flex items-center gap-4 p-2">
              {isExpanded && <span>Chat</span>}
              <MessageCircle className="size-6" />
            </Link>
          </div>
        </div>

        {/* Bottom section */}
        <div className="flex flex-col gap-4 w-full">
          {authUser && (
            <>
              <Link to="/account" className="btn btn-ghost flex items-center gap-4 p-2">
                {isExpanded && <span>Pagamentos</span>}
                <CreditCard className="size-6" />
              </Link>

              <Link to="/settings" className="btn btn-ghost flex items-center gap-4 p-2">
                {isExpanded && <span>Configurações</span>}
                <Settings className="size-6" />
              </Link>

              <Link to="/profile" className="btn btn-ghost flex items-center gap-4 p-2">
                {isExpanded && <span>Perfil</span>}
                <img
                  src={authUser.profilePic || "/avatar.png"}
                  alt="Profile"
                  className="size-12 rounded-full object-cover"
                />
              </Link>

              <button onClick={handleLogout} className="btn btn-ghost flex items-center gap-4 p-2">
                {isExpanded && <span>Sair</span>}
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
