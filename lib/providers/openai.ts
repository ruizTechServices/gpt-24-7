// lib/providers/openai.ts
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function askOpenAI(prompt: string, model = 'gpt-4o-mini') {
  const started = Date.now();
  const res = await client.responses.create({
    model,
    input: prompt,
    temperature: 0.4,
  });
  const text = (res as any).output_text ?? '';
  const latency_ms = Date.now() - started;
  return { provider: 'openai' as const, model, text, latency_ms };
}
