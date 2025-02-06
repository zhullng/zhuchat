import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Certifique-se de definir essa variável de ambiente
});

export const generateAIResponse = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem não pode estar vazia" });
    }

    // Chamada para a API da OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: message }], // Usando 'message' corretamente
    });

    console.log("OpenAI Response:", response);

    res.json({ response: response.choices[0].message.content });
  } catch (error) {
    console.error("Erro na API OpenAI:", error);

    res.status(500).json({ error: "Erro ao processar a resposta da IA" });
  }
};
