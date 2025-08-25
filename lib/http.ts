// lib/http.ts
import { headers } from 'next/headers';

export async function getBaseUrl() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return process.env.SITE_URL ?? `${proto}://${host}`;
}
