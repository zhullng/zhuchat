// src/CheckoutForm.js
import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const CheckoutForm = () => {
  const stripe = useStripe();  // Inicia o Stripe
  const elements = useElements();  // Inicia os elementos para capturar o cartão de crédito
  const [amount, setAmount] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Verifica se o Stripe e o Elements estão prontos
    if (!stripe || !elements) {
      return;
    }

    // Cria o PaymentMethod com o CardElement
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
    });

    if (error) {
      setError(error.message);  // Exibe erro caso ocorra
      return;
    }

    // Envia o PaymentMethod para o backend
    const response = await fetch('/api/create-customer', {
      method: 'POST',
      body: JSON.stringify({
        paymentMethodId: paymentMethod.id,
        amount,
        recipientId,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.error) {
      setError(data.error);
    } else {
      setStatus('Transferência realizada com sucesso!');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Transferência de Dinheiro</h3>

      {/* Campo para inserir o valor da transferência */}
      <input
        type="number"
        placeholder="Valor em Euros"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {/* Campo para inserir o ID do destinatário */}
      <input
        type="text"
        placeholder="ID do Destinatário"
        value={recipientId}
        onChange={(e) => setRecipientId(e.target.value)}
      />

      {/* Campo do cartão de crédito */}
      <CardElement />

      {/* Botão para enviar o formulário */}
      <button type="submit" disabled={!stripe}>Realizar Transferência</button>

      {/* Exibe o status ou erro */}
      {status && <div>{status}</div>}
      {error && <div>{error}</div>}
    </form>
  );
};

export default CheckoutForm;
