import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Middleware para proteger rotas
export const protectRoute = async (req, res, next) => {
  try {
    // Recebe o token do cookie
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    // Verifica e decodifica o token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        // Se o token for expirado ou inválido
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ message: "Unauthorized - Token Expired" });
        }
        return res.status(401).json({ message: "Unauthorized - Invalid Token" });
      }

      // Procura o user na bd pelo ID do token
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Adiciona o user
      req.user = user;

      // Chama o próximo middleware
      next();
    });
  } catch (error) {
    console.log("Error in protectRoute middleware: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
