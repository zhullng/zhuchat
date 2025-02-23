import Navbar from "./components/Navbar";
import AIChat from './pages/AIChat';
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage"; 
import LoginPage from "./pages/LoginPage"; 
import SettingsPage from "./pages/SettingsPage"; 
import ProfilePage from "./pages/ProfilePage"; 

import { Routes, Route, Navigate, useLocation } from "react-router-dom"; // Adicionei useLocation
import { useAuthStore } from "./store/useAuthStore"; 
import { useThemeStore } from "./store/useThemeStore"; 
import { useEffect } from "react"; 

import { Loader } from "lucide-react"; 
import { Toaster } from "react-hot-toast"; 

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { theme } = useThemeStore();
  const location = useLocation(); // Hook para acessar a localização atual

  console.log({ onlineUsers });

  useEffect(() => {
    checkAuth(); 
  }, [checkAuth]);

  console.log({ authUser });

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" /> 
      </div>
    );
  }

  // Verifica se a rota atual é login ou signup
  const isLoginOrSignupPage = location.pathname === "/login" || location.pathname === "/signup";

  return (
    <div data-theme={theme}> 
      {/* Renderiza a Navbar apenas se não for a página de login ou signup */}
      {!isLoginOrSignupPage && <Navbar />}

      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignUpPage /> : <Navigate to="/" />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/chat"
          element={authUser ? <AIChat /> : <Navigate to="/login" />}
        />
      </Routes>

      <Toaster /> 
    </div>
  );
};

export default App;