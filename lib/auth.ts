// lib/auth.ts
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase/server';

export async function getUserOrNull() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    // Surface SDK/network errors instead of silently treating as unauthenticated.
    // Keeping behavior minimal: rethrow with context for upstream logging/handling.
    throw new Error(`supabase.auth.getUser failed: ${error.message}`);
  }

  return data.user ?? null;
}

export async function requireUser() {
  try {
    const user = await getUserOrNull();
    if (!user) redirect('/login');
    return user;
  } catch (err) {
    // Preserve stack and message; callers can add observability if desired.
    throw err;
  }
}
