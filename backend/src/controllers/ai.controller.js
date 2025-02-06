import { Configuration, OpenAIApi } from "openai";

const openai = new OpenAIApi(
  new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

export const generateAIResponse = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem não pode estar vazia." });
    }

    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{ role: "user", content: message }],
    });

    res.json({ response: response.data.choices[0].message.content });
  } catch (error) {
    console.error("Erro ao chamar OpenAI:", error);
    res.status(500).json({ error: "Erro ao processar a resposta da IA." });
  }
};
