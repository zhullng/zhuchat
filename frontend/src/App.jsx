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
import toast from "react-hot-toast";

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
    
    const initSocketAndListeners = async () => {
      try {
        // Inicializar socket se necessário
        const socket = getSocket() || initializeSocket();
        
        if (!socket) {
          console.error("Não foi possível inicializar o socket");
          return;
        }
        
        // Conectar ao serviço de sinalização com o ID do usuário autenticado
        await signalingService.connect(authUser._id);
        console.log("Serviço de sinalização conectado com ID:", authUser._id);
        
        // Configurar listener para chamadas recebidas
        const handleIncomingCall = (data) => {
          console.log("Chamada recebida:", data);
          
          if (activeCall) {
            console.log("Já existe uma chamada ativa. Rejeitando chamada recebida.");
            signalingService.rejectCall(data.callerId, data.callId);
            return;
          }
          
          // Mostrar interface de chamada recebida
          setIncomingCall({
            id: data.callId,
            caller: {
              id: data.callerId,
              name: data.callerName || "Usuário"
            },
            isVideo: data.callType === "video"
          });
          
          // Tocar som de chamada (opcional)
          // playRingtone();
        };
        
        // Configurar listener para quando chamada for aceita
        const handleCallAccepted = (data) => {
          console.log("Chamada aceita:", data);
          
          // Se não houver chamada ativa, isso não deveria acontecer
          if (!activeCall) {
            console.warn("Recebido evento de chamada aceita, mas não há chamada ativa");
            return;
          }
          
          toast.success("Chamada aceita!");
        };
        
        // Configurar listener para chamadas rejeitadas
        const handleCallRejected = (data) => {
          console.log("Chamada rejeitada:", data);
          
          toast.error("Chamada rejeitada pelo usuário");
          setActiveCall(null);
        };
        
        // Configurar listener para chamadas encerradas
        const handleCallEnded = (data) => {
          console.log("Chamada encerrada:", data);
          
          toast.success("Chamada encerrada");
          setActiveCall(null);
        };
        
        // Registrar event listeners
        signalingService.off("incomingCall"); // Remove handlers anteriores
        signalingService.off("callAccepted");
        signalingService.off("callRejected");
        signalingService.off("callEnded");
        
        signalingService.on("incomingCall", handleIncomingCall);
        signalingService.on("callAccepted", handleCallAccepted);
        signalingService.on("callRejected", handleCallRejected);
        signalingService.on("callEnded", handleCallEnded);
      } catch (error) {
        console.error("Erro ao inicializar socket e listeners:", error);
      }
    };
    
    initSocketAndListeners();
    
    // Limpar event listeners quando o componente for desmontado
    return () => {
      signalingService.off("incomingCall");
      signalingService.off("callAccepted");
      signalingService.off("callRejected");
      signalingService.off("callEnded");
    };
  }, [authUser]);

  // Lidar com aceitação de chamada
  const handleAcceptCall = (callId, callerId, isVideo) => {
    console.log("Aceitando chamada:", { callId, callerId, isVideo });
    
    // Fechar interface de chamada recebida
    setIncomingCall(null);
    
    // Iniciar chamada ativa (importante incluir isIncoming: true)
    setActiveCall({
      userId: callerId,
      userName: "Usuário", // Idealmente buscar o nome real do usuário
      isVideo,
      isIncoming: true // Indica que é uma chamada recebida e já aceita
    });
  };
  
  // Lidar com rejeição de chamada
  const handleRejectCall = () => {
    console.log("Rejeitando chamada de:", incomingCall?.caller.id);
    
    if (incomingCall) {
      // Rejeitar chamada no serviço de sinalização
      signalingService.rejectCall(incomingCall.caller.id, incomingCall.id);
    }
    
    // Fechar interface de chamada recebida
    setIncomingCall(null);
  };
  
  // Encerrar chamada ativa
  const handleEndCall = () => {
    console.log("Encerrando chamada ativa");
    setActiveCall(null);
  };

  // Iniciar uma chamada (para uso em outros componentes se necessário)
  const initiateCall = (userId, userName, isVideo = false) => {
    console.log("Iniciando chamada para:", userId);
    
    // Verificar se já há uma chamada ativa
    if (activeCall || incomingCall) {
      toast.error("Já existe uma chamada em andamento");
      return;
    }
    
    // Iniciar chamada ativa
    setActiveCall({
      userId,
      userName,
      isVideo,
      isIncoming: false // Indica que é uma chamada iniciada pelo usuário
    });
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
          userName={activeCall.userName}
          isVideo={activeCall.isVideo}
          isIncoming={activeCall.isIncoming}
          onClose={handleEndCall}
        />
      )}

      <Toaster /> 
    </div>
  );
};

export default App;