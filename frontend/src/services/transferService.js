import axios from 'axios';

const API_URL = '/api/wallet';

// Transferir fundos por email
export const transferByEmail = async (transferData) => {
  try {
    const response = await axios.post(`${API_URL}/transfers`, transferData);
    return response;
  } catch (error) {
    throw error;
  }
};

// Transferir fundos por QR code
export const transferByQRCode = async (transferData) => {
  try {
    const response = await axios.post(`${API_URL}/transfers/qr`, transferData);
    return response;
  } catch (error) {
    throw error;
  }
};

// Gerar QR code do utilizador
export const generateUserQRCode = async () => {
  try {
    const response = await axios.get(`${API_URL}/transfers/qr-code`);
    return response.data;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

// Obter histórico de transferências
export const getTransfers = async () => {
  try {
    const response = await axios.get(`${API_URL}/transfers`);
    return response.data;
  } catch (error) {
    console.error('Error fetching transfers:', error);
    throw error;
  }
};