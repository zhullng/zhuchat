import axios from 'axios';

const API_URL = '/api';

// Transferir fundos por email
export const transferByEmail = async (transferData) => {
  try {
    const response = await axios.post(`${API_URL}/transfers`, transferData);
    return response.data;
  } catch (error) {
    console.error('Error transferring funds by email:', error);
    throw error;
  }
};

// Transferir fundos por QR code
export const transferByQRCode = async (transferData) => {
  try {
    const response = await axios.post(`${API_URL}/transfers/qr`, transferData);
    return response.data;
  } catch (error) {
    console.error('Error transferring funds by QR code:', error);
    throw error;
  }
};

// Gerar QR code do utilizador
export const generateUserQRCode = async () => {
  try {
    // URL corrigida de 'qr-code' para 'qrcode'
    const response = await axios.get(`${API_URL}/transfers/qrcode`);
    
    // Verificação adicional para garantir que a resposta contém o QR code
    if (!response.data || !response.data.qrCode) {
      throw new Error('Resposta inválida do servidor: QR code não recebido');
    }
    
    return response.data.qrCode;
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