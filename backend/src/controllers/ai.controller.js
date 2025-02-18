import axios from 'axios';

// Criando uma instância personalizada do axios
const axiosInstance = axios.create({
  baseURL: 'https://api-inference.huggingface.co',  // Base URL
  headers: {
    // Aqui você pode colocar headers padrão, mas a chave será sobrescrita pela do req.headers caso necessário
    'Authorization': `Bearer ${process.env.AI_API_KEY}`,
  }
});

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

    // Usando a instância personalizada do axios
    const response = await axiosInstance.post(
      "/models/deepseek-ai/DeepSeek-R1",  // O baseURL já foi configurado na instância
      { inputs: message }
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
