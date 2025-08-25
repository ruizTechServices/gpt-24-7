// lib/router.ts
type RouteChoice = { provider: 'openai' | 'anthropic'; model: string; reason: string };

const keywordsHeavy = [/analy[sz]e|reason|long\s*form|proof|optimi[sz]e|strategy|architecture/i];

export function chooseModel(input: string): RouteChoice {
  const len = (input ?? '').length;
  const heavy = keywordsHeavy.some((rx) => rx.test(input));
  if (heavy || len > 600) {
    return {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      reason: heavy ? 'keyword' : 'length',
    };
  }
  return { provider: 'openai', model: 'gpt-4o-mini', reason: 'default' };
}
