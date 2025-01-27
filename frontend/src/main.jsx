import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css"; 
import App from "./App.jsx";

import { BrowserRouter } from "react-router-dom"; // Responsável por gerir a navegação da aplicação em rotas

createRoot(document.getElementById("root")).render(
  <StrictMode> {/* Identificar problemas de ciclo de vida, APIs, etc */}
    <BrowserRouter> {/* Ativa a funcionalidade de rotas na aplicação */}
      <App />
    </BrowserRouter>
  </StrictMode>
);
