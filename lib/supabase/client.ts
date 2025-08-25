// lib/supabase/client.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';

const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}
if (!anon && !publishable) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (anon || publishable)!
);

export function createSupabaseBrowserClient() {
  return supabase;
}
