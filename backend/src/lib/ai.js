import axios from 'axios';

export const getAIResponse = async (message) => {
  try {
    const response = await axios.post('/api/ai/chat', { 
      message 
    }, {
      withCredentials: true // Importante para enviar cookies de autenticação
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