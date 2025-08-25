// lib/auth.ts
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase/server';

export async function getUserOrNull() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function requireUser() {
  const user = await getUserOrNull();
  if (!user) redirect('/login');
  return user;
}
