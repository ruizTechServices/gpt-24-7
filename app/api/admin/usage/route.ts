// app/api/admin/usage/route.ts
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { supabaseService } from '@/lib/db';
import { Tables } from '@/lib/supabase/database.types';

export const runtime = 'nodejs';

export async function GET() {
  const user = await requireUser();

  // Admin gate: prefer role, fallback to email domain while roles are being assigned
  const role = (user.app_metadata as { role?: string })?.role;
  const isAdmin = role === 'admin' || (user.email?.endsWith('@ruiztechservices.com') ?? false);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = supabaseService();

  // Pull last 100 usage rows (all users) and all payments via service role (bypass RLS)
  const { data: usage } = await db
    .from('usage_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: pay } = await db.from('payments').select('*');

  const revenue =
    (pay ?? [])
      .filter((p: Tables<'payments'>) => p.status === 'succeeded')
      .reduce((s: number, p: Tables<'payments'>) => s + (p.amount_cents || 0), 0) / 100;

  return NextResponse.json({ revenue, last100: usage ?? [] });
}
