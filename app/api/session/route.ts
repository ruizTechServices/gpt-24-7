// app/api/session/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ active: false });

  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('status', 'active')
    .order('ends_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date();
  const active = !!data && new Date(data.ends_at) > now;
  return NextResponse.json({
    active,
    endsAt: data?.ends_at ?? null,
    tokensUsed: data?.tokens_used ?? 0,
    tokenLimit: data?.token_limit ?? 0,
  });
}
