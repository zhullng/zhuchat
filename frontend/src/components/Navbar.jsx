import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, Settings, User, Menu } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="border-l fixed top-0 right-0 z-40 w-16 h-full flex flex-col items-center"
    >
      <div className="flex flex-col items-center justify-between p-4 w-full h-full">
        <Link to="/" className="flex flex-col items-center gap-2.5 hover:opacity-80 transition-all">
          <div className="size-10 rounded-lg flex items-center justify-center overflow-hidden">
            <img src="/logoZhuChat.svg" alt="ZhuChat Logo" className="w-12 h-12" />
          </div>
          <h1 className="text-xs font-bold text-center">ZhuChat</h1>
        </Link>

        <div className="relative mt-6">
          <button
            className="btn btn-sm gap-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu className="size-5" />
          </button>

          {menuOpen && (
            <div className="absolute top-10 right-0 mt-2 w-48 shadow-lg rounded-lg p-2">
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
