// lib/providers/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function askAnthropic(prompt: string, model = 'claude-3-5-sonnet-20241022') {
  const started = Date.now();
  const msg = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  const text =
    (msg.content as any[])
      ?.map((c) => ('text' in c ? c.text : ''))
      .join('') ?? '';
  const latency_ms = Date.now() - started;
  return { provider: 'anthropic' as const, model, text, latency_ms };
}
