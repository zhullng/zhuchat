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
    <div style={{ overflow: "hidden" }} data-theme={theme}> {/* Desabilita o scroll aqui */}
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
