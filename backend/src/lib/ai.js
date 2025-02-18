export const getAIResponse = async (message) => {
  try {
    const response = await fetch("http://localhost:5000/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    console.log("Resposta da IA:", data); // Adiciona log no console
    return data.response || "Não consegui entender. Pode reformular?";
  } catch (error) {
    console.error("Erro ao obter resposta da IA:", error);
    return "Ocorreu um erro. Tente novamente.";
  }
};
