import axios from 'axios';

export const getAIResponse = async (message) => {
  try {
    // Enviar a requisição com os cookies automaticamente (sem necessidade de passar o token manualmente)
    const response = await axios.post('/api/ai/chat', { 
      message 
    }, {
      withCredentials: true, // Garante que os cookies são enviados na requisição
    });

    if (!response.data || !response.data.response) {
      throw new Error('Resposta inválida do servidor');
    }

    return response.data.response;
  } catch (error) {
    console.error('Erro detalhado:', error.response?.data || error);
    throw new Error(error.response?.data?.error || 'Não foi possível obter a resposta da IA');
  }
};
