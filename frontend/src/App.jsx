// src/App.jsx
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
import CallsProvider from "./components/CallsProvider"; // Importar o componente de chamadas

import { Routes, Route, Navigate, useLocation } from "react-router-dom"; 
import { useAuthStore } from "./store/useAuthStore"; 
import { useThemeStore } from "./store/useThemeStore"; 
import { useEffect } from "react"; 

import { Loader } from "lucide-react"; 
import { Toaster } from "react-hot-toast"; 

// Função para verificar/configurar o arquivo de ringtone
const setupRingtone = () => {
  // Verificar se já existe um toque de chamada
  fetch('/sounds/ringtone.mp3')
    .then(response => {
      if (!response.ok) {
        console.warn('Arquivo de toque não encontrado. Os usuários não ouvirão um som para chamadas recebidas.');
      }
    })
    .catch(error => {
      console.warn('Erro ao verificar arquivo de toque:', error);
    });
};

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth(); 
    // Verificar o arquivo de ringtone
    setupRingtone();
  }, [checkAuth]);

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

  // Wrapper de conteúdo com CallsProvider quando o usuário está autenticado
  const ContentWrapper = ({ children }) => {
    return authUser ? (
      <CallsProvider>
        {children}
      </CallsProvider>
    ) : children;
  };

  return (
    <div className="h-screen supports-[height:100cqh]:h-[100cqh] supports-[height:100svh]:h-[100svh] flex flex-col" data-theme={theme}>
      {/* Renderiza a Navbar apenas se não for uma das páginas onde ela deve ser escondida */}
      {!hideNavbarPages && <Navbar />}

      <ContentWrapper>
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
      </ContentWrapper>

      <Toaster /> 
    </div>
  );
};

export default App;