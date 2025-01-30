import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "Gmail", // Ou outro serviço de e-mail
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendPasswordResetEmail = async (email, resetUrl) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Redefinição de Senha",
    html: `
      <p>Você solicitou a redefinição de senha. Clique no link abaixo para continuar:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>Se você não solicitou isso, ignore este e-mail.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};