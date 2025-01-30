import nodemailer from "nodemailer";

// Crie uma conta em https://ethereal.email/
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  auth: {
    user: "seu-user@ethereal.email", // Gerado no site
    pass: "sua-senha", // Gerado no site
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

export const sendTestEmail = async () => {
    await sendPasswordResetEmail("joaozhu10@gmail.com", "https://zhuchat.onrender.com");
  };

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