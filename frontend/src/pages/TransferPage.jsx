// src/App.js (ou outro componente onde você lida com a transferência)

import React, { useState } from "react";
import { transferFunds } from "../services/paymentService.js";  // Importe a função de transferência

const TransferPage = () => {
  const [senderId, setSenderId] = useState("");  // ID do remetente
  const [receiverId, setReceiverId] = useState("");  // ID do receptor
  const [amount, setAmount] = useState(0);  // Valor da transferência
  const [tokenId, setTokenId] = useState("");  // Token gerado pelo Stripe (você precisa obtê-lo)

  const handleTransfer = async () => {
    // Chame a função de transferência de fundos
    const result = await transferFunds(senderId, receiverId, amount, tokenId);

    if (result.error) {
      alert(`Erro: ${result.error}`);  // Exibe o erro
    } else {
      alert("Transferência realizada com sucesso!");  // Exibe a mensagem de sucesso
    }
  };

  return (
    <div>
      <h1>Transferência de Fundos</h1>
      <div>
        <label>Remetente:</label>
        <input 
          type="text" 
          value={senderId}
          onChange={(e) => setSenderId(e.target.value)}
          placeholder="ID do Remetente" 
        />
      </div>

      <div>
        <label>Receptor:</label>
        <input 
          type="text" 
          value={receiverId}
          onChange={(e) => setReceiverId(e.target.value)}
          placeholder="ID do Receptor" 
        />
      </div>

      <div>
        <label>Valor:</label>
        <input 
          type="number" 
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Valor" 
        />
      </div>

      <div>
        <label>Token Stripe:</label>
        <input 
          type="text" 
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          placeholder="Token gerado pelo Stripe" 
        />
      </div>

      <button onClick={handleTransfer}>Realizar Transferência</button>
    </div>
  );
};

export default TransferPage;
