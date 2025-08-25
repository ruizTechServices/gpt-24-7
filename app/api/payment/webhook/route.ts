// app/api/payment/webhook/route.ts
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function grantOrExtend(db: ReturnType<typeof supabaseService>, userId: string) {
  const now = new Date();
  const { data: existing } = await db
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('ends_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const baseStart = now;
  const baseEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (existing && new Date(existing.ends_at) > now) {
    const newEnd = new Date(new Date(existing.ends_at).getTime() + 24 * 60 * 60 * 1000);
    const { error: updErr } = await db
      .from('sessions')
      .update({ ends_at: newEnd.toISOString() })
      .eq('id', existing.id);
    if (updErr) console.error('[webhook] sessions.update error', updErr);
  } else {
    const { error: insErr } = await db.from('sessions').insert({
      user_id: userId,
      status: 'active',
      starts_at: baseStart.toISOString(),
      ends_at: baseEnd.toISOString(),
      tokens_used: 0,
      token_limit: 200000,
    });
    if (insErr) console.error('[webhook] sessions.insert error', insErr);
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  console.log('[webhook] received', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId =
      (session.client_reference_id as string) || (session.metadata?.userId as string) || null;
    const amountCents = session.amount_total ?? 100;
    const currency = session.currency?.toUpperCase() ?? 'USD';
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;
    const checkoutSessionId = session.id;

    const db = supabaseService();

    // Persist payment (avoid onConflict unless DB has unique constraints)
    const { error: payErr1 } = await db
      .from('payments')
      .insert({
        user_id: userId,
        provider: 'stripe',
        checkout_session_id: checkoutSessionId,
        payment_intent_id: paymentIntentId || null,
        amount_cents: amountCents,
        currency,
        status: 'succeeded',
      });
    if (payErr1 && payErr1.code !== '23505')
      console.error('[webhook] payments.insert (checkout.session.completed) error', payErr1);

    // Grant or extend 24h access
    if (userId) {
      await grantOrExtend(db, userId);
    }
  } else if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const userId = (pi.metadata?.userId as string) || null;
    const paymentIntentId = pi.id;
    const amountCents = typeof pi.amount_received === 'number' ? pi.amount_received : pi.amount ?? 0;
    const currency = (pi.currency ?? 'usd').toUpperCase();
    const db = supabaseService();

    // Try to backfill checkout_session_id if PI came from Checkout
    let checkoutSessionId: string | null = null;
    try {
      const list = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
      checkoutSessionId = list.data[0]?.id ?? null;
    } catch {}

    const { error: payErr2 } = await db
      .from('payments')
      .insert({
        user_id: userId,
        provider: 'stripe',
        checkout_session_id: checkoutSessionId,
        payment_intent_id: paymentIntentId,
        amount_cents: amountCents,
        currency,
        status: 'succeeded',
      });
    if (payErr2 && payErr2.code !== '23505')
      console.error('[webhook] payments.insert (payment_intent.succeeded) error', payErr2);

    if (userId) {
      await grantOrExtend(db, userId);
    }
  } else if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const paymentIntentId = typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id ?? null;
    let userId: string | null = null;
    if (paymentIntentId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        userId = (pi.metadata?.userId as string) || null;
      } catch {}
    }
    const amountCents = invoice.amount_paid ?? invoice.amount_due ?? 0;
    const currency = (invoice.currency ?? 'usd').toUpperCase();
    const db = supabaseService();

    const { error: payErr3 } = await db
      .from('payments')
      .insert({
        user_id: userId,
        provider: 'stripe',
        checkout_session_id: null,
        payment_intent_id: paymentIntentId,
        amount_cents: amountCents,
        currency,
        status: 'succeeded',
      });
    if (payErr3 && payErr3.code !== '23505')
      console.error('[webhook] payments.insert (invoice.paid) error', payErr3);

    if (userId) {
      await grantOrExtend(db, userId);
    }
  }

  return NextResponse.json({ received: true });
}
