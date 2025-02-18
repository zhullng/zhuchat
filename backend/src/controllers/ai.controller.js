import axios from 'axios';

export const generateAIResponse = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem não pode estar vazia" });
    }

    // Verifica se a chave da API está presente
    const apiKey = process.env.AI_API_KEY; // Sua chave da API Claude
    if (!apiKey) {
      return res.status(500).json({ error: "Chave de API não fornecida" });
    }

    // Requisição para o modelo Claude
    const response = await axios.post(
      'https://api.anthropic.com/v1/claude', // Endpoint da API Claude (verifique a URL correta)
      {
        model: "claude-v1",  // O nome do modelo que você quer usar
        prompt: message,     // A mensagem que você quer enviar ao modelo
        max_tokens: 1000,    // Limite de tokens (ajuste conforme necessário)
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Se a resposta contiver a chave esperada
    if (response.data && response.data.choices && response.data.choices[0].text) {
      return res.json({ response: response.data.choices[0].text });
    } else {
      console.error("Resposta inesperada:", response.data);
      return res.status(500).json({ error: "Resposta inválida da IA" });
    }

  } catch (error) {
    console.error("Erro na API Claude:", error.response?.data || error.message || error);
    return res.status(500).json({ error: "Erro ao processar a resposta da IA" });
  }
};
