// app/api/session/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('status', 'active')
      .order('ends_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching session:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    if (!session || new Date(session.ends_at) < new Date()) {
      return NextResponse.json({ active: false, endsAt: null, tokensUsed: 0, tokenLimit: 0 });
    }

    return NextResponse.json({
      active: true,
      endsAt: session.ends_at,
      tokensUsed: session.tokens_used,
      tokenLimit: session.token_limit,
    });
  } catch (e) {
    console.error('Unexpected error in /api/session:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
