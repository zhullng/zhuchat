import stripe from 'stripe';

const stripeClient = stripe(process.env.STRIPE_API_SECRET);

const chargeCustomer = async (req, res) => {
  const { tokenId, amount } = req.body; // tokenId é o token gerado no frontend e amount é o valor

  try {
    const charge = await stripeClient.charges.create({
      amount, // Valor em centavos (por exemplo: 1000 = 10,00 EUR)
      currency: 'eur', // Moeda em euros (EUR)
      description: 'Compra de créditos virtuais',
      source: tokenId,
    });

    // Aqui você pode adicionar a lógica para atualizar o saldo virtual do usuário no banco de dados, se necessário
    res.status(200).json(charge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Usando export default
export default chargeCustomer;
