import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Middleware de proteção de rota
export const protectRoute = async (req, res, next) => {
  try {
    // Obter o token do cookie
    const token = req.cookies.jwt;

    // Se não houver token, retornar erro de autorização
    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    // Verificar e decodificar o token usando o segredo JWT
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        // Se o token for expirado ou inválido
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ message: "Unauthorized - Token Expired" });
        }
        return res.status(401).json({ message: "Unauthorized - Invalid Token" });
      }

      // Buscar o usuário no banco de dados usando o ID do token
      const user = await User.findById(decoded.userId).select("-password");

      // Se o usuário não for encontrado, retornar erro
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Adicionar o usuário à requisição para que possa ser acessado em rotas subsequentes
      req.user = user;

      // Chamar o próximo middleware ou rota
      next();
    });
  } catch (error) {
    console.log("Error in protectRoute middleware: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
