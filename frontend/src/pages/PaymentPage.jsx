import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const PaymentPage = () => {
  const [loading, setLoading] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);

    // Cria o token com os dados do cartão
    const { token, error } = await stripe.createToken(elements.getElement(CardElement));

    if (error) {
      console.log(error.message);
      setLoading(false);
    } else {
      // Envia o token para o backend para processar o pagamento
      const response = await fetch('https://zhuchat.onrender.com/api/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: token.id,
          amount: 1000, // Valor a ser cobrado (exemplo: 1000 = 10.00 EUR)
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.error(data.error);
      } else {
        console.log('Pagamento bem-sucedido!');
        // Aqui você pode atualizar o saldo virtual do usuário após o pagamento
      }

      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Página de Pagamento</h1>
      <form onSubmit={handleSubmit}>
        <CardElement />
        <button type="submit" disabled={!stripe || loading}>
          {loading ? 'Carregando...' : 'Pagar'}
        </button>
      </form>
    </div>
  );
};

export default PaymentPage;
