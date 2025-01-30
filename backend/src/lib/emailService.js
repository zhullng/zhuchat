import nodemailer from "nodemailer";

// Configure o transporter com um serviço de e-mail real
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email", // Exemplo, use o host do serviço real de e-mail
  port: 587,
  auth: {
    user: "seu-user@ethereal.email", // Substitua pelo seu usuário de email real
    pass: "sua-senha", // Substitua pela senha real
  },
});

// Função para verificar as credenciais
transporter.verify((error) => {
  if (error) {
    console.error("Erro no serviço de e-mail:", error);
  } else {
    console.log("Serviço de e-mail configurado!");
  }
});

export const sendPasswordResetEmail = async (email, resetUrl) => {
  const mailOptions = {
    from: '"ZhuChat" <noreply@https://zhuchat.onrender.com>',
    to: email,
    subject: "Redefinição de Senha",
    html: `<p>Clique <a href="${resetUrl}">aqui</a> para redefinir sua senha.</p>`,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("E-mail enviado:", info.messageId, info.envelope);
};
