// src/App.jsx
import { useEffect, useState } from "react";
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
import IncomingCall from "./components/IncomingCall";
import WebRTCCall from "./components/WebRTCCall";

import { Routes, Route, Navigate, useLocation } from "react-router-dom"; 
import { useAuthStore } from "./store/useAuthStore"; 
import { useThemeStore } from "./store/useThemeStore"; 
import { getSocket, initializeSocket } from "./services/socket";
import signalingService from "./services/signalingService";

import { Loader } from "lucide-react"; 
import { Toaster } from "react-hot-toast"; 

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const location = useLocation();
  
  // Estado para gerenciar chamadas recebidas e ativas
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  // Inicializar socket e ouvir eventos de chamada
  useEffect(() => {
    if (!authUser) return;
    
    // Inicializar socket se necessário
    const socket = getSocket() || initializeSocket();
    
    if (!socket) return;
    
    // Conectar ao serviço de sinalização com o ID do usuário autenticado
    signalingService.connect(authUser._id);
    
    // Configurar listener para chamadas recebidas
    const handleIncomingCall = (data) => {
      console.log("Chamada recebida:", data);
      
      // Mostrar interface de chamada recebida
      setIncomingCall({
        id: data.callId,
        caller: {
          id: data.callerId,
          name: data.callerName || "Usuário"
        },
        isVideo: data.callType === "video"
      });
    };
    
    // Configurar listener para chamadas encerradas
    const handleCallEnded = () => {
      setActiveCall(null);
    };
    
    // Registrar event listeners
    signalingService.on("incomingCall", handleIncomingCall);
    signalingService.on("callEnded", handleCallEnded);
    
    // Limpar event listeners quando o componente for desmontado
    return () => {
      signalingService.off("incomingCall", handleIncomingCall);
      signalingService.off("callEnded", handleCallEnded);
    };
  }, [authUser]);

  // Lidar com aceitação de chamada
  const handleAcceptCall = (callId, callerId, isVideo) => {
    setIncomingCall(null);
    
    // Iniciar chamada ativa
    setActiveCall({
      userId: callerId,
      isVideo
    });
  };
  
  // Lidar com rejeição de chamada
  const handleRejectCall = () => {
    setIncomingCall(null);
  };
  
  // Encerrar chamada ativa
  const handleEndCall = () => {
    setActiveCall(null);
  };

  useEffect(() => {
    checkAuth();
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

      {/* Componente de chamada recebida */}
      {incomingCall && (
        <IncomingCall
          caller={incomingCall.caller}
          callId={incomingCall.id}
          isVideo={incomingCall.isVideo}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
      
      {/* Componente de chamada ativa */}
      {activeCall && (
        <WebRTCCall
          userId={activeCall.userId}
          userName="Usuário" // Idealmente, buscar o nome do usuário
          isVideo={activeCall.isVideo}
          onClose={handleEndCall}
        />
      )}

      <Toaster /> 
    </div>
  );
};

export default App;