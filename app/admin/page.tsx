// app/admin/page.tsx
import { requireUser } from '@/lib/auth';

export default async function AdminPage() {
  const user = await requireUser();
  if (!user.email?.endsWith('@ruiztechservices.com')) return <div>Forbidden</div>;

  const res = await fetch(`${process.env.SITE_URL}/api/admin/usage`, { cache: 'no-store' });
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
