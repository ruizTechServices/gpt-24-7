// app/api/payment/checkout/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/payments/stripe';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = data.user.email ?? undefined;
  const url = await createCheckoutSession({ userId: data.user.id, email });
  return NextResponse.json({ url });
}
