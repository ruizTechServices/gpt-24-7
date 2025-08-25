// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { chooseModel } from '@/lib/router';
import { askOpenAI } from '@/lib/providers/openai';
import { askAnthropic } from '@/lib/providers/anthropic';
import { estimateTokens } from '@/lib/tokens';
import { supabaseService } from '@/lib/db';

export const runtime = 'nodejs';

const Body = z.object({
  message: z.string().min(1),
  override: z
    .object({
      provider: z.enum(['openai', 'anthropic']).optional(),
      model: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', data.user.id)
    .eq('status', 'active')
    .order('ends_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session || new Date(session.ends_at) < new Date()) {
    return NextResponse.json({ error: 'No active session' }, { status: 402 });
  }

  const projected = (session.tokens_used ?? 0) + 2000; // rough pre-check (adjust)
  if (projected > (session.token_limit ?? 200000)) {
    return NextResponse.json({ error: 'Token allowance reached' }, { status: 402 });
  }

  const rl = await checkRateLimit(data.user.id, 30, 60);
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const bodyText = await req.text();
  const body = Body.parse(JSON.parse(bodyText));
  const input = body.message;

  let choice = chooseModel(input);
  if (body.override?.provider) choice.provider = body.override.provider;
  if (body.override?.model) choice.model = body.override.model;

  const ask =
    choice.provider === 'openai'
      ? await askOpenAI(input, choice.model)
      : await askAnthropic(input, choice.model);

  const est_tokens = estimateTokens(input) + estimateTokens(ask.text);

  if ((session.tokens_used ?? 0) + est_tokens > (session.token_limit ?? 200000)) {
    return NextResponse.json({ error: 'Token allowance reached' }, { status: 402 });
  }

  const sr = supabaseService();
  await sr.from('usage_log').insert({
    user_id: data.user.id,
    session_id: session.id,
    provider: ask.provider,
    model: ask.model,
    prompt_chars: input.length,
    response_chars: ask.text.length,
    est_tokens,
    latency_ms: ask.latency_ms,
  });

  await sr
    .from('sessions')
    .update({ tokens_used: (session.tokens_used ?? 0) + est_tokens })
    .eq('id', session.id);

  return NextResponse.json({ reply: ask.text, provider: ask.provider, model: ask.model });
}
