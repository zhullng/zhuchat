import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, Settings, User } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();

  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 
    backdrop-blur-lg bg-base-100/80"
    >
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-4 sm:gap-8">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
              <div className="size-10 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                <img
                  src="/logoZhuChat.svg"
                  alt="ZhuChat Logo"
                  className="w-16 h-16 sm:w-20 sm:h-20"
                />
              </div>
              <h1 className="text-lg font-bold">ZhuChat</h1>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to={"/settings"}
              className="btn btn-sm gap-2 hidden sm:flex transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>

            {authUser && (
              <>
                <Link
                  to={"/profile"}
                  className="btn btn-sm gap-2 hidden sm:flex"
                >
                  <User className="size-5" />
                  <span>Profile</span>
                </Link>

                <button
                  className="flex gap-2 items-center btn btn-sm hidden sm:flex"
                  onClick={logout}
                >
                  <LogOut className="size-5" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
