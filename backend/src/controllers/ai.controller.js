import axios from 'axios';

export const generateAIResponse = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "A mensagem não pode estar vazia" });
    }

    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Chave de API não fornecida" });
    }

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: message
        }]
      },
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
      }
    );

    if (response.data && response.data.content && response.data.content[0].text) {
      return res.json({ response: response.data.content[0].text });
    } else {
      console.error("Resposta inesperada:", response.data);
      return res.status(500).json({ error: "Resposta inválida da IA" });
    }

  } catch (error) {
    console.error("Erro na API Claude:", error.response?.data || error.message || error);
    return res.status(500).json({ 
      error: "Erro ao processar a resposta da IA",
      details: error.response?.data?.error?.message || error.message
    });
  }
};