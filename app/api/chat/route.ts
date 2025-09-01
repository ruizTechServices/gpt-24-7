// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { chooseModel } from '@/lib/router';
import { askOpenAI } from '@/lib/providers/openai';
import { askAnthropic } from '@/lib/providers/anthropic';
import { estimateTokens } from '@/lib/tokens';
import type { Tables, TablesInsert, Database } from '@/lib/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

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
  try {
    const supabase = (await createSupabaseServerClient()) as unknown as SupabaseClient<Database>;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', data.user.id)
      .eq('status', 'active')
      .order('ends_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const session = sessionData as Tables<'sessions'> | null;

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

    const choice = chooseModel(input);
    if (body.override?.provider) choice.provider = body.override.provider;
    if (body.override?.model) choice.model = body.override.model;

    try {
      const ask =
        choice.provider === 'openai'
          ? await askOpenAI(input, choice.model)
          : await askAnthropic(input, choice.model);

      const est_tokens = estimateTokens(input) + estimateTokens(ask.text);

      if ((session.tokens_used ?? 0) + est_tokens > (session.token_limit ?? 200000)) {
        return NextResponse.json({ error: 'Token allowance reached' }, { status: 402 });
      }

      // Atomically consume tokens to prevent race conditions
      // Note: consume_tokens RPC isn't in Database.Functions; use a typed wrapper without `any`.
      type ConsumeTokensRow = { ok: boolean; new_tokens_used: number };
      type RpcCall = (
        fn: 'consume_tokens',
        params: { p_session_id: string; p_inc: number }
      ) => Promise<{ data: ConsumeTokensRow[] | null; error: { message: string } | null }>;
      const rpcFn = supabase.rpc as unknown as RpcCall;
      const { data: rpc, error: rpcErr } = await rpcFn('consume_tokens', {
        p_session_id: session.id,
        p_inc: est_tokens,
      });
      const rpcOk = rpc?.[0]?.ok ?? false;
      const rpcNew = rpc?.[0]?.new_tokens_used ?? null;
      if (rpcErr || !rpcOk) {
        console.warn('[CHAT][consume_tokens] reject', {
          session_id: session.id,
          est_tokens,
          err: rpcErr?.message,
          ok: rpcOk,
          new_tokens_used: rpcNew,
        });
        return NextResponse.json({ error: 'Token allowance reached' }, { status: 402 });
      }
      if (process.env.NODE_ENV !== 'production') {
        console.log('[CHAT][consume_tokens] ok', {
          session_id: session.id,
          est_tokens,
          new_tokens_used: rpcNew,
        });
      }

      const usageInsert: TablesInsert<'usage_log'> = {
        user_id: data.user.id,
        session_id: session.id,
        provider: ask.provider,
        model: ask.model,
        prompt_chars: input.length,
        response_chars: ask.text.length,
        est_tokens,
        latency_ms: ask.latency_ms,
      };
      await supabase.from('usage_log').insert(usageInsert);

      return NextResponse.json({ reply: ask.text, provider: ask.provider, model: ask.model });
    } catch (error) {
      console.error('[CHAT]', error);
      return NextResponse.json({ error: 'Failed to fetch response from AI provider' }, { status: 500 });
    }
  } catch (error) {
    console.error('[CHAT]', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
