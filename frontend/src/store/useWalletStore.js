import { create } from 'zustand';
import toast from 'react-hot-toast';
import axios from 'axios';

export const useWalletStore = create((set, get) => ({
  // Estado
  balance: 0,
  transactions: [],
  transfers: [],
  isLoading: false,
  error: null,

  fetchWalletData: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const userResponse = await axios.get('/api/auth/check');
      
      // Obter histórico de transações
      const transactionsResponse = await axios.get('/api/transactions');
      
      // Obter histórico de transferências
      const transfersResponse = await axios.get('/api/transfers');
      
      // Validar se as respostas são arrays
      const transactionsData = Array.isArray(transactionsResponse.data) 
        ? transactionsResponse.data 
        : [];
      
      const transfersData = Array.isArray(transfersResponse.data) 
        ? transfersResponse.data 
        : [];
      
      const userBalance = userResponse.data.balance !== undefined 
        ? userResponse.data.balance 
        : 0;
      
      set({ 
        balance: userBalance,
        transactions: transactionsData,
        transfers: transfersData,
        isLoading: false
      });
      
      console.log('Transactions loaded:', transactionsData.length);
      console.log('Transfers loaded:', transfersData.length);
    } catch (error) {
      console.error('Erro ao carregar dados da carteira:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Erro ao carregar dados da carteira',
        transactions: [],
        transfers: []
      });
      toast.error('Não foi possível carregar os dados da carteira');
    }
  },
  
  deposit: async (amount, method, details) => {
    try {
      set({ isLoading: true, error: null });
      
      let response;
      
      if (method === 'card') {
        response = await axios.post('/api/transactions/deposits/card', { amount, cardDetails: details });
      } else {
        response = await axios.post('/api/transactions/deposits/other', { amount, method, details });
      }
      
      // Recarregar dados da carteira
      await get().fetchWalletData();
      
      toast.success(response.data.message || 'Depósito realizado com sucesso');
      return response.data;
    } catch (error) {
      console.error('Erro ao depositar:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Erro ao processar depósito' 
      });
      toast.error(error.response?.data?.message || 'Não foi possível processar o depósito');
      throw error;
    }
  },
  
  withdraw: async (amount, method, details) => {
    try {
      set({ isLoading: true, error: null });
      
      let response;
      
      if (method === 'card') {
        response = await axios.post('/api/transactions/withdrawals/card', { amount, cardDetails: details });
      } else {
        response = await axios.post('/api/transactions/withdrawals/other', { amount, method, details });
      }
      
      // Recarregar dados da carteira
      await get().fetchWalletData();
      
      toast.success(response.data.message || 'Levantamento realizado com sucesso');
      return response.data;
    } catch (error) {
      console.error('Erro ao levantar fundos:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Erro ao processar levantamento' 
      });
      toast.error(error.response?.data?.message || 'Não foi possível processar o levantamento');
      throw error;
    }
  },
  
  transfer: async (receiverEmail, amount) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await axios.post('/api/transfers', { receiverEmail, amount });
      
      // Recarregar dados da carteira
      await get().fetchWalletData();
      
      toast.success(response.data.message || 'Transferência realizada com sucesso');
      return response.data;
    } catch (error) {
      console.error('Erro ao transferir:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Erro ao processar transferência' 
      });
      toast.error(error.response?.data?.message || 'Não foi possível processar a transferência');
      throw error;
    }
  },
  
  transferByQR: async (qrData, amount) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await axios.post('/api/transfers/qr', { qrData, amount });
      
      // Recarregar dados da carteira
      await get().fetchWalletData();
      
      toast.success(response.data.message || 'Transferência por QR realizada com sucesso');
      return response.data;
    } catch (error) {
      console.error('Erro ao transferir por QR:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Erro ao processar transferência por QR' 
      });
      toast.error(error.response?.data?.message || 'Não foi possível processar a transferência');
      throw error;
    }
  },
  
  generateQRCode: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // URL corrigida para /api/transfers/qrcode
      const response = await axios.get('/api/transfers/qrcode');
      
      set({ isLoading: false });
      
      // Verificar se a resposta tem os dados esperados
      if (!response.data || !response.data.qrCode) {
        throw new Error('Resposta inválida do servidor');
      }
      
      return response.data.qrCode;
    } catch (error) {
      console.error('Erro ao gerar QR code:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Erro ao gerar QR code' 
      });
      toast.error('Não foi possível gerar o QR code');
      throw error;
    }
  },
  
  resetWalletState: () => {
    set({
      balance: 0,
      transactions: [],
      transfers: [],
      isLoading: false,
      error: null
    });
  }
}));