import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage"; 
import LoginPage from "./pages/LoginPage"; 
import SettingsPage from "./pages/SettingsPage"; 
import ProfilePage from "./pages/ProfilePage"; 
import ResetPasswordPage from "./pages/ResetPasswordPage";

import { Routes, Route, Navigate } from "react-router-dom"; // Gerir as rotas da aplicação.
import { useAuthStore } from "./store/useAuthStore"; // Rstado de autenticação
import { useThemeStore } from "./store/useThemeStore"; // Tema da aplicação
import { useEffect } from "react"; // Importa o `useEffect` para efeitos colaterais

import { Loader } from "lucide-react"; // Refresh ícone animado
import { Toaster } from "react-hot-toast"; // Importa o sistema de notificações

const App = () => {
  // Funções relacionadas à autenticação
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();

  const { theme } = useThemeStore();

  console.log({ onlineUsers }); // Regista os users online na consola

  useEffect(() => {
    checkAuth(); // Verifica o estado de autenticação quando o componente é carregado
  }, [checkAuth]);

  console.log({ authUser }); // Regista o estado atual do utilizador autenticado na consola

  // Enquanto verifica a autenticação e não há user autenticado, mostra o refresh
  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" /> 
      </div>
    );

  return (
    <div data-theme={theme}> {/* Define o tema da aplicação */}
      <Navbar /> 

      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />} // Apenas para users autenticados
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
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />} // Apenas para users autenticados
        />
         <Route
          path="/reset-password" element={authUser ? <ResetPasswordPage /> : <Navigate to="/login" />} // Apenas para users autenticados
        />
      </Routes>

      <Toaster /> {/* Componente para mostrar notificações */}
    </div>
  );
};

export default App;
