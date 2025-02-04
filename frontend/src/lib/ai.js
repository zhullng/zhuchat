import axios from 'axios';

export const getAIResponse = async (message) => {
  try {
    const response = await axios.post(
      '/api/ai/chat',
      { message },
      { withCredentials: true }
    );
    return response.data.response;
  } catch (error) {
    console.error('Erro ao obter resposta da IA:', error);
    throw error;
  }
};