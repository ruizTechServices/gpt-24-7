// lib/payments/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createCheckoutSession({
  userId,
  email,
}: {
  userId: string;
  email?: string;
}) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: userId,
    metadata: { userId },
    // Ensure the PaymentIntent also carries userId for PI webhooks
    payment_intent_data: { metadata: { userId } },
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: '24HourGPT — 24‑Hour Access' },
          unit_amount: 100,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.SITE_URL}/dashboard?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.SITE_URL}/dashboard?canceled=1`,
  });
  if (!session.url) throw new Error('Stripe Checkout URL not returned');
  return session.url;
}
