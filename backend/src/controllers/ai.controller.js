const axios = require('axios');

export const generateAIResponse = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem não pode estar vazia" });
    }

    // Verifica se a chave da API está presente
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Chave de API não fornecida" });
    }

    const response = await axios.post('https://api-inference.huggingface.co/models/distilbert-base-uncased', // Usando o modelo distilgpt2
      { inputs: message },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      }
    );

    if (response.data && response.data[0] && response.data[0].generated_text) {
      return res.json({ response: response.data[0].generated_text });
    } else {
      return res.status(500).json({ error: "Resposta inválida da IA" });
    }

  } catch (error) {
    console.error("Erro na API Hugging Face:", error);
    return res.status(500).json({ error: "Erro ao processar a resposta da IA" });
  }
};
