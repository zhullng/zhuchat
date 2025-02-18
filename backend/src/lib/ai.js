import axios from 'axios';

export const getAIResponse = async (message) => {
  try {
    const response = await axios.post('/api/ai/chat', { message });
    return response.data.response;
  } catch (error) {
    console.error('Erro ao chamar a IA:', error);
    throw new Error('Não foi possível obter a resposta da IA');
  }
};
