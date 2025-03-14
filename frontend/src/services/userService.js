import axios from 'axios';

const API_URL = '/api/users';

// Obter informações do utilizador
export const getUserInfo = async () => {
  try {
    const response = await axios.get(`${API_URL}/me`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user info:', error);
    throw error;
  }
};

// Atualizar informações do utilizador
export const updateUserInfo = async (userData) => {
  try {
    const response = await axios.put(`${API_URL}/me`, userData);
    return response.data;
  } catch (error) {
    console.error('Error updating user info:', error);
    throw error;
  }
};

// Atualizar palavra-passe
export const updatePassword = async (passwordData) => {
  try {
    const response = await axios.put(`${API_URL}/password`, passwordData);
    return response.data;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};