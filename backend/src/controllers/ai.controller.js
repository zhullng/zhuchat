import { axiosInstance } from "../../../frontend/src/lib/axios"; // Importa a instância personalizada do axios

export const generateAIResponse = async (req, res) => {
  try {
    const { message } = req.body; // A mensagem que vem do corpo da requisição

    if (!message) {
      return res.status(400).json({ error: "Mensagem não pode estar vazia" });
    }

    // Chamada para a API da Hugging Face usando a instância personalizada do axios
    const response = await axiosInstance.post(
      "https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-R1",
      { inputs: message }, // Passa a mensagem recebida na requisição
      {
        headers: {
          "Authorization": `Bearer ` + process.env.AI_API_KEY, // Substitua com a sua chave de API
        },
      }
    );

    console.log("Hugging Face Response:", response.data);

    // Verifique a estrutura da resposta e extraia o texto gerado, caso esteja presente
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
