import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, Settings, User, Menu } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 
      backdrop-blur-lg bg-base-100/80"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
          <div className="size-10 rounded-lg bg-white flex items-center justify-center overflow-hidden">
            <img src="/logoZhuChat.svg" alt="ZhuChat Logo" className="w-20 h-20" />
          </div>
          <h1 className="text-lg font-bold">ZhuChat</h1>
        </Link>

        <div className="relative">
          <button
            className="btn btn-sm gap-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu className="size-5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg p-2">
              <Link to="/settings" className="flex items-center gap-2 p-2 hover:bg-gray-200 rounded">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>
              {authUser && (
                <>
                  <Link to="/profile" className="flex items-center gap-2 p-2 hover:bg-gray-200 rounded">
                    <User className="size-5" />
                    <span>Profile</span>
                  </Link>
                  <button
                    className="flex items-center gap-2 p-2 w-full text-left hover:bg-gray-200 rounded"
                    onClick={logout}
                  >
                    <LogOut className="size-5" />
                    <span>Logout</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
