import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    async enviarEmail(destinatario, assunto, conteudo) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || `"ZhuChat" <${process.env.EMAIL_USER}>`,
                to: destinatario,
                subject: assunto,
                html: conteudo
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email enviado com sucesso:', info.messageId);
            return info;
        } catch (error) {
            console.error('Erro ao enviar email:', error);
            throw error;
        }
    }

    // Método para testar a conexão com o servidor de email
    async testarConexao() {
        try {
            const result = await this.transporter.verify();
            console.log('Conexão com o servidor de email estabelecida:', result);
            return { success: true };
        } catch (error) {
            console.error('Falha na conexão com o servidor de email:', error);
            return { success: false, error };
        }
    }
}

const emailService = new EmailService();
export default emailService;