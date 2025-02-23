import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'; // Para integração com Stripe
import { toast } from 'react-hot-toast';

const TransferirPage = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
  
    if (!stripe || !elements) {
      return;
    }
  
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
    });
  
    if (error) {
      setError(error.message);
      return;
    }
  
    // Enviar dados para o backend para processar a transferência
    const response = await fetch('/api/transferir', {
      method: 'POST',
      body: JSON.stringify({
        paymentMethodId: paymentMethod.id, // Certifique-se de enviar o paymentMethod.id
        amount,
        destinatarioAccountId: recipientId, // Passando o ID do destinatário
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  
    const data = await response.json();
  
    if (data.error) {
      setError(data.error);
      toast.error(data.error);
    } else {
      setStatus('Transferência realizada com sucesso!');
      toast.success('Transferência realizada com sucesso!');
    }
  };
  

  return (
    <div className="max-w-lg mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Realizar Transferência</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="number"
            className="input input-bordered w-full mb-4"
            placeholder="Valor em Euros"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div>
          <input
            type="text"
            className="input input-bordered w-full mb-4"
            placeholder="ID do Destinatário"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <CardElement />
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={!stripe || !amount || !recipientId}
        >
          Transferir
        </button>
      </form>

      {status && <div className="text-green-500 mt-4">{status}</div>}
      {error && <div className="text-red-500 mt-4">{error}</div>}
    </div>
  );
};

export default TransferirPage;
