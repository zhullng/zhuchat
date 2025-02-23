// src/StripeConfig.js
import { loadStripe } from '@stripe/stripe-js';

// Carrega a chave pública do Stripe (substitua pela sua chave pública real)
export const stripePromise = loadStripe('pk_test_51QvlRaRvfvZ3znJngic0rL0b7HirA98kuLD76gYQwuzDpYXzFDRatUxtF2NpEftRlTpAvgnHL8s2apILeFBHZ50700Kwq0rsfu');  // Substitua pela chave pública do seu projeto Stripe
