// src/components/PaymentForm.js
import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';

// Carregar a chave pública do Stripe
const stripePromise = loadStripe('pk_test_51QvlRaRvfvZ3znJngic0rL0b7HirA98kuLD76gYQwuzDpYXzFDRatUxtF2NpEftRlTpAvgnHL8s2apILeFBHZ50700Kwq0rsfu');

const PaymentForm = ({ onTokenReceived }) => {
  const [tokenId, setTokenId] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    const stripe = await stripePromise;
    const { token, error } = await stripe.createToken();

    if (error) {
      console.error(error);
    } else {
      setTokenId(token.id);  // Aqui você obtém o token para usar na requisição de transferência
      if (onTokenReceived) onTokenReceived(token.id);  // Envia o token ao componente pai
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit">Pagar</button>
    </form>
  );
};

export default PaymentForm;
