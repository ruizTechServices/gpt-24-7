// lib/tokens.ts
export function estimateTokens(str: string) {
    // crude approximation: ~4 chars per token
    return Math.ceil((str ?? '').length / 4);
  }
  