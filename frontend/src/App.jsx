import Navbar from "./components/Navbar";
import AIChat from './components/AIChat';
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage"; 
import LoginPage from "./pages/LoginPage"; 
import SettingsPage from "./pages/SettingsPage"; 
import ProfilePage from "./pages/ProfilePage"; 

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore"; // Estado de autenticação
import { useThemeStore } from "./store/useThemeStore"; // Tema da aplicação
import { useEffect } from "react"; // Importa o `useEffect` para efeitos colaterais

import { Loader } from "lucide-react"; // Ícone de loading
import { Toaster } from "react-hot-toast"; // Sistema de notificações

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { theme } = useThemeStore();

  console.log({ onlineUsers }); // Registra os users online na consola

  useEffect(() => {
    checkAuth(); // Verifica o estado de autenticação quando o componente é carregado
  }, [checkAuth]);

  console.log({ authUser }); // Registra o estado atual do utilizador autenticado na consola

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" /> 
      </div>
    );
  }

  return (
    <div data-theme={theme}> {/* Define o tema da aplicação */}
      <Navbar /> 

      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />} // Apenas para usuários autenticados
        />
        <Route
          path="/signup"
          element={!authUser ? <SignUpPage /> : <Navigate to="/" />} // Apenas para não autenticados
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />} // Apenas para não autenticados
        />
        <Route path="/settings" element={<SettingsPage />} /> {/* Para todos */}
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />} // Apenas para usuários autenticados
        />
        <Route path="/chat" element={<AIChat />} />
      </Routes>

      <Toaster /> {/* Componente para mostrar notificações */}
    </div>
  );
};

export default App;
