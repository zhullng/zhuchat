import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Substitua pela sua chave de API
});


export const generateAIResponse = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem não pode estar vazia." });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: userInput }],
    });    

    res.json({ response: response.data.choices[0].message.content });
  } catch (error) {
    console.error("Erro ao chamar OpenAI:", error);
    res.status(500).json({ error: "Erro ao processar a resposta da IA." });
  }
};
