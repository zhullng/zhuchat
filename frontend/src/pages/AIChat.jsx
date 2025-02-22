import axios from 'axios';
import Cookies from 'js-cookie';

export const getAIResponse = async (message) => {
  try {
    // Obtendo o token do cookie
    const token = Cookies.get('authToken'); // Supondo que o cookie se chama 'authToken'
    const apiKey = 'sua-chave-de-api-aqui'; // Substitua pela sua chave de API real

    if (!token) {
      throw new Error('Token não encontrado. Por favor, faça login novamente.');
    }

    const response = await axios.post('/api/ai/chat', { 
      message 
    }, {
      headers: {
        Authorization: `Bearer ${token}`, // Adiciona o token no cabeçalho
        'x-api-key': apiKey, // Adiciona a chave da API no cabeçalho
      },
      withCredentials: true, // Envia cookies, caso necessário
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
