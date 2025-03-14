import axios from 'axios';

const API_URL = '/api/wallet';

// Depósitos
export const depositByCard = async (depositData) => {
  try {
    const response = await axios.post(`${API_URL}/deposits/card`, depositData);
    return response;
  } catch (error) {
    throw error;
  }
};

export const depositByOtherMethod = async (depositData) => {
  try {
    const response = await axios.post(`${API_URL}/deposits/other`, depositData);
    return response;
  } catch (error) {
    throw error;
  }
};

// Levantamentos
export const withdrawByCard = async (withdrawData) => {
  try {
    const response = await axios.post(`${API_URL}/withdrawals/card`, withdrawData);
    return response;
  } catch (error) {
    throw error;
  }
};

export const withdrawByOtherMethod = async (withdrawData) => {
  try {
    const response = await axios.post(`${API_URL}/withdrawals/other`, withdrawData);
    return response;
  } catch (error) {
    throw error;
  }
};

// Histórico de transações
export const getTransactions = async () => {
  try {
    const response = await axios.get(`${API_URL}/transactions`);
    return response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};