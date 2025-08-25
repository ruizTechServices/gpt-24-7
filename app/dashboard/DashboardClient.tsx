'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import BuyButton from '@/components/typescript/customized_components/BuyButton';

export default function DashboardClient({ user, session }: { user: any; session: any }) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="grid gap-4">
      <div className="rounded border bg-white p-4">
        <div className="font-medium text-xl text-black">Session</div>
        {session.active ? (
          <div className="text-sm text-green-600">
            Active until {new Date(session.ends_at).toLocaleString()}
          </div>
        ) : (
          <div className="text-sm text-red-600">No active pass.</div>
        )}
        <BuyButton />
      </div>
      <div className="rounded border bg-white p-4">
        <div className="font-medium text-xl text-black">Account</div>
        <div className="text-sm text-neutral-700">{user.email}</div>
        <button
          className="text-sm underline disabled:opacity-50"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            await createSupabaseBrowserClient().auth.signOut();
            window.location.href = '/';
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
