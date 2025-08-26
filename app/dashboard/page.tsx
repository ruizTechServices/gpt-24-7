// app/dashboard/page.tsx
import { requireUser } from '@/lib/auth';
import { getBaseUrl } from '@/lib/http';
import { cookies } from 'next/headers';
import DashboardClient from '@/app/dashboard/DashboardClient';

type SessionData = {
  active: boolean;
  endsAt: string | null;
  tokensUsed: number;
  tokenLimit: number;
};

async function fetchSession(): Promise<SessionData> {
  const base = await getBaseUrl();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  const res = await fetch(`${base}/api/session`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) {
    console.error('Failed to fetch session:', res.status, res.statusText);
    return { active: false, endsAt: null, tokensUsed: 0, tokenLimit: 0 };
  }
  return res.json() as Promise<SessionData>;
}

export default async function Dashboard() {
  const user = await requireUser();
  const session = await fetchSession();

  return <DashboardClient user={user} session={session} />;
}
