// src/services/paymentService.js

const transferFunds = async (senderId, receiverId, amount, tokenId) => {
    try {
      const response = await fetch("/api/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId,  // ID do usuário remetente
          receiverId,  // ID do usuário receptor
          amount,  // Valor da transferência
          tokenId,  // Token do Stripe gerado no frontend
        }),
      });
  
      const result = await response.json();
  
      if (response.ok) {
        // Sucesso na transferência
        console.log('Transferência realizada com sucesso:', result);
        return result;  // Retorne a resposta de sucesso, pode incluir mais dados se necessário
      } else {
        // Erro na requisição
        console.error('Erro na transferência:', result.error);
        return { error: result.error };  // Retorna o erro para o frontend exibir
      }
    } catch (error) {
      console.error('Erro ao conectar com o backend:', error.message);
      return { error: "Erro ao realizar a transferência. Tente novamente." };  // Mensagem de erro geral
    }
  };
  
  export { transferFunds };
  