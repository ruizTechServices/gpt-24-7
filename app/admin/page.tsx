// app/admin/page.tsx
import { requireUser } from '@/lib/auth';

export default async function AdminPage() {
  const user = await requireUser();
  const role = (user.app_metadata as { role?: string })?.role;
  const isAdmin = role === 'admin' || (user.email?.endsWith('@ruiztechservices.com') ?? false);
  if (!isAdmin) return <div>Forbidden</div>;

  const base = process.env.SITE_URL?.replace(/\/$/, '') ?? '';
  const res = await fetch(base ? `${base}/api/admin/usage` : '/api/admin/usage', { cache: 'no-store' });
  const json = await res.json();

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <div className="rounded border p-4 bg-white">
        <div>Total Revenue: <b>${Number(json.revenue ?? 0).toFixed(2)}</b></div>
      </div>
      <div className="rounded border p-4 bg-white overflow-auto">
        <pre className="text-xs">{JSON.stringify(json.last100 ?? [], null, 2)}</pre>
      </div>
    </div>
  );
}
