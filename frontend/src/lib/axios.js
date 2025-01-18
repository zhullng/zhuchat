import axios from "axios"; 
// Importa a biblioteca Axios para requisições HTTP de forma simplificada

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api",
  // Se o ambiente for "development", usa "http://localhost:5001/api"

  withCredentials: true,
  // Permite o envio de cookies e credenciais junto com as requisições
  // Necessário para autenticação em aplicações que usam cookies para manter sessões de users
});
