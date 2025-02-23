import React from 'react';
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, Settings, User, MessageCircle, Repeat, Smartphone } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();

  return (
    <header className="border-l fixed top-0 right-0 z-40 w-16 h-full bg-[#18191B]">
      <div className="flex flex-col items-center justify-between p-4 h-full">
        {/* Top section */}
        <div className="flex flex-col items-center gap-6">
          <Link to="/" className="flex items-center justify-center hover:opacity-80 transition-all">
            <div className="size-10 rounded-full bg-white flex items-center justify-center overflow-hidden">
              <img src="/logoZhuChat.svg" alt="Logo" className="w-6 h-6" />
            </div>
          </Link>

          <div className="flex flex-col gap-4">
            <button className="size-10 rounded-full bg-[#2D2E35] flex items-center justify-center text-white hover:bg-[#3D3E45] transition-all">
              <MessageCircle className="size-5" />
            </button>
            
            <button className="size-10 rounded-full bg-[#2D2E35] flex items-center justify-center text-white hover:bg-[#3D3E35] transition-all">
              <Repeat className="size-5" />
            </button>
          </div>
        </div>

        {/* Bottom section */}
        <div className="flex flex-col gap-4">
          <button className="size-10 rounded-full bg-[#2D2E35] flex items-center justify-center text-white hover:bg-[#3D3E45] transition-all">
            <Smartphone className="size-5" />
          </button>

          {authUser && (
            <>
              <Link to="/settings" className="size-10 rounded-full bg-[#2D2E35] flex items-center justify-center text-white hover:bg-[#3D3E45] transition-all">
                <Settings className="size-5" />
              </Link>
              
              <Link to="/profile" className="size-10 rounded-full bg-[#2D2E35] flex items-center justify-center text-white hover:bg-[#3D3E45] transition-all">
                <User className="size-5" />
              </Link>

              <button 
                onClick={logout}
                className="size-10 rounded-full bg-[#2D2E35] flex items-center justify-center text-white hover:bg-[#3D3E45] transition-all"
              >
                <LogOut className="size-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;