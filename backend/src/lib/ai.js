import axios from 'axios';

export const getAIResponse = async (message) => {
  try {
    // Obtenha o token armazenado
    const token = localStorage.getItem('authToken') || ''; // Certifique-se de que o token esteja armazenado

    // Enviar o token na requisição
    const response = await axios.post('/api/ai/chat', { 
      message 
    }, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '', // Adiciona o token no cabeçalho se disponível
      },
      withCredentials: true, // Caso você esteja usando cookies para autenticação
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
