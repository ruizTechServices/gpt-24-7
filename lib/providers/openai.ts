// lib/providers/openai.ts
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function askOpenAI(prompt: string, model = 'gpt-4o-mini') {
  const started = Date.now();
  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
  });
  const text = completion.choices[0].message.content ?? '';
  const latency_ms = Date.now() - started;
  return { provider: 'openai' as const, model, text, latency_ms };
}
