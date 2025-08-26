'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import BuyButton from '@/components/typescript/customized_components/BuyButton';
import { User } from '@supabase/supabase-js';

interface SessionData {
  active: boolean;
  endsAt: string | null;
  tokensUsed: number;
  tokenLimit: number;
}

export default function DashboardClient({ user, session }: { user: User; session: SessionData }) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="grid gap-4">
      <div className="rounded border bg-white p-4">
        <div className="font-medium text-xl text-black">Session</div>
        {session.active ? (
          <div className="text-sm text-green-600">
            Active until {new Date(session.endsAt!).toLocaleString()}
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
          className="text-sm underline disabled:opacity-50 text-black"
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
