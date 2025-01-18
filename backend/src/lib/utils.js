import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // Define o tempo de validade do cookie como 7 dias em ms
    httpOnly: true, // Impede ataques de XSS (Cross-Site Scripting) protege de scripts que tentam roubar cookies.
    sameSite: "strict", // Protege contra ataques CSRF (Cross-Site Request Forgery) o cookie só será enviado em requisições do mesmo domínio
    secure: process.env.NODE_ENV !== "development", // Se a aplicação estiver em ambiente de desenvolvimento, o cookie é enviado em HTTP. Em produção, deve ser enviado apenas via HTTPS.
  });
  

  return token;
};
