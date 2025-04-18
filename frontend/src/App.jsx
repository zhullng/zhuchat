import { useEffect } from "react";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage"; 
import LoginPage from "./pages/LoginPage"; 
import SettingsPage from "./pages/SettingsPage"; 
import ProfilePage from "./pages/ProfilePage"; 
import AccountPage from './pages/AccountPage'; 
import ThemePage from "./pages/ThemePage";
import WalletPage from './pages/WalletPage';
import SettingsProfilePage from './pages/SettingsProfilePage'; 
import ChangePasswordPage from './pages/ChangePasswordPage'; 
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DeleteAccountPage from "./pages/DeleteAccountPage";
import BlockedUsersPage from "./pages/BlockedUsersPage";

import { Routes, Route, Navigate, useLocation } from "react-router-dom"; 
import { useAuthStore } from "./store/useAuthStore"; 
import { useThemeStore } from "./store/useThemeStore";
import { useWalletStore } from "./store/useWalletStore";
import { enableSocketDebug } from "./services/socket";

import { Loader } from "lucide-react"; 
import { Toaster } from "react-hot-toast"; 

const App = () => {
  const { 
    authUser, 
    checkAuth, 
    isCheckingAuth,
    checkSocketHealth
  } = useAuthStore();
  const { theme } = useThemeStore();
  const { setupWalletListeners } = useWalletStore();
  const location = useLocation();

  // Verificação inicial de autenticação
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Monitoramento de saúde do socket e configuração de ouvintes de wallet
  useEffect(() => {
    if (!authUser) return;
    
    // Em desenvolvimento, ativar logs de debug do socket
    if (import.meta.env.MODE === "development") {
      enableSocketDebug();
    }
    
    // Verificação inicial do socket após um curto delay
    const initialCheck = setTimeout(() => {
      const socketOk = checkSocketHealth();
      
      if (socketOk) {
        // Configurar ouvintes para atualizações de carteira
        setupWalletListeners();
      }
    }, 2000);
    
    // Verificação periódica a cada 30 segundos
    const intervalId = setInterval(() => {
      checkSocketHealth();
    }, 30000);
    
    return () => {
      clearTimeout(initialCheck);
      clearInterval(intervalId);
    };
  }, [authUser, checkSocketHealth, setupWalletListeners]);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" /> 
      </div>
    );  
  }

  // Verificar se é uma página que não deve mostrar a Navbar
  const hideNavbarPages = 
    location.pathname === "/login" || 
    location.pathname === "/signup" || 
    location.pathname === "/forgot-password" || 
    location.pathname.startsWith("/reset-password/");

  return (
    <div className="h-screen supports-[height:100cqh]:h-[100cqh] supports-[height:100svh]:h-[100svh] flex flex-col" data-theme={theme}>
      {/* Renderiza a Navbar apenas se não for uma das páginas onde ela deve ser escondida */}
      {!hideNavbarPages && <Navbar />}

      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/profile" element={<SettingsProfilePage />} />
        <Route path="/theme" element={<ThemePage />} />
        <Route path="/security/password" element={<ChangePasswordPage />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/wallet" element={authUser ? <WalletPage /> : <Navigate to="/login" />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/security/delete-account" element={authUser ? <DeleteAccountPage /> : <Navigate to="/login" />} />
        <Route path="/privacy/blocked" element={authUser ? <BlockedUsersPage /> : <Navigate to="/login" />} />
      </Routes>

      <Toaster /> 
    </div>
  );
};

export default App;