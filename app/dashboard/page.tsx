import { requireUser } from '@/lib/auth';
import BuyButton from '@/components/typescript/customized_components/BuyButton';
import { getBaseUrl } from '@/lib/http';
import { cookies } from 'next/headers';

async function fetchSession() {
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
  return res.json();
}

export default async function Dashboard() {
  const user = await requireUser();
  const sess = await fetchSession();

  return (
    <div className="grid gap-4">
      <div className="rounded border bg-white p-4">
        <div className="font-medium">Session</div>
        {sess.active ? (
          <div className="text-green-600">Active until {new Date(sess.endsAt).toLocaleString()}</div>
        ) : (
          <div className="text-red-600">No active pass.</div>
        )}
      </div>

      {!sess.active && <BuyButton />}

      <div className="rounded border bg-white p-4">
        <div className="font-medium">Account</div>
        <div className="text-sm text-neutral-700">{user.email}</div>
      </div>
    </div>
  );
}
