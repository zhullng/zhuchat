import React from 'react';
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, Settings, MessageCircle } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();

  return (
    <nav className="fixed top-0 w-full bg-base-300 border-b border-base-200 z-50">
      <div className="flex items-center justify-between h-16 px-4 max-w-7xl mx-auto">
        {/* Top section */}
        <Link to="/" className="text-xl font-bold">
          Logo
        </Link>

        {/* Bottom section */}
        {authUser && (
          <div className="flex items-center gap-4">
            <Link to="/messages" className="hover:text-primary">
              <MessageCircle className="w-6 h-6" />
            </Link>
            
            <div className="relative group">
              <button className="flex items-center gap-2">
                {/* Profile image with fallback */}
                <img
                  src={authUser.profilePic || "/avatar.png"}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border-2 border-base-200"
                />
              </button>

              {/* Dropdown menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-base-300 rounded-lg shadow-lg border border-base-200 hidden group-hover:block">
                <div className="p-2">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 p-2 hover:bg-base-200 rounded-md"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Profile Settings</span>
                  </Link>
                  
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 p-2 w-full hover:bg-base-200 rounded-md text-left text-red-500"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;