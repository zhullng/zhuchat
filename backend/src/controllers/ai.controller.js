import { config } from "dotenv";
config(); // Certifique-se de que isso está no topo do arquivo

import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const generateAIResponse = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user._id; // Supondo que você tem autenticação JWT

    // Validação básica
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Mensagem inválida" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: message
      }],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;

    // Aqui você pode salvar a interação no banco de dados se necessário
    // await saveChatHistory(userId, message, aiResponse);

    res.status(200).json({ response: aiResponse });

  } catch (error) {
    console.error('Erro OpenAI:', error);
    res.status(500).json({ error: error.message || "Erro ao processar a requisição" });
  }
};