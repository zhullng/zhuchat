import { getSocket } from './socket';
import { useChatStore } from '../store/useChatStore';
import toast from 'react-hot-toast';

/**
 * Configura os listeners para eventos de contactos no socket
 */
export const subscribeToContactEvents = () => {
  const socket = getSocket();
  if (!socket) {
    console.log("Socket não está disponível para subscrever a eventos de contactos");
    return false;
  }
  
  // Novo pedido de contacto recebido
  socket.on('newContactRequest', (data) => {
    console.log('Novo pedido de contacto recebido:', data);
    // Atualizar a lista de pedidos pendentes
    useChatStore.getState().getPendingRequests();
    
    // Exibir uma notificação
    toast.success(`Novo pedido de contacto de ${data.fullName || 'um utilizador'}`);
  });
  
  // Contacto foi aceite (resposta a um pedido enviado por nós)
  socket.on('contactAccepted', (data) => {
    console.log('Pedido de contacto aceite:', data);
    // Atualizar a lista de utilizadores
    useChatStore.getState().getUsers();
    
    // Exibir uma notificação
    toast.success(`${data.fullName || 'Um utilizador'} aceitou o seu pedido de contacto`);
  });
  
  // Contacto foi aceite pelo destinatário - nova notificação específica para quem enviou o pedido
  socket.on('contactRequestAccepted', (data) => {
    console.log('Pedido de contacto que enviaste foi aceite:', data);
    // Atualizar a lista de utilizadores
    useChatStore.getState().getUsers();
    
    // Exibir uma notificação
    toast.success(`${data.fullName || 'Um utilizador'} foi adicionado aos teus contactos`);
  });
  
  // Contacto foi rejeitado
  socket.on('contactRejected', () => {
    console.log('Pedido de contacto rejeitado');
    // Não precisamos fazer nada especial aqui além de log
  });
  
  // Contacto removido (quando alguém nos remove)
  socket.on('contactRemoved', () => {
    console.log('Foi removido da lista de contactos de alguém');
    // Atualizar a lista de utilizadores
    useChatStore.getState().getUsers();
  });
  
  console.log("Subscrito a eventos de contactos com sucesso");
  return true;
};

/**
 * Remove os listeners de eventos de contactos
 */
export const unsubscribeFromContactEvents = () => {
  const socket = getSocket();
  if (!socket) return;
  
  socket.off('newContactRequest');
  socket.off('contactAccepted');
  socket.off('contactRequestAccepted');
  socket.off('contactRejected');
  socket.off('contactRemoved');
  
  console.log("Cancelada subscrição a eventos de contactos");
};