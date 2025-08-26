'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import BuyButton from './BuyButton';

interface DashboardClientProps {
  user: { email: string | undefined };
  session: { active: boolean; ends_at: string | null };
}

export default function DashboardClient({ user, session }: DashboardClientProps) {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await createSupabaseBrowserClient().auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="grid gap-4">
      <div className="rounded border bg-white p-4">
        <div className="font-medium text-xl text-black">Session</div>
        {session.active ? (
          <div className="text-green-600">Active until {new Date(session.ends_at!).toLocaleString()}</div>
        ) : (
          <div className="text-red-600">No active pass.</div>
        )}
        <BuyButton />
      </div>
      <div className="rounded border bg-white p-4">
        <div className="font-medium text-xl text-black">Account</div>
        <div className="text-sm text-neutral-700">{user.email}</div>
        <button
          className="text-sm underline disabled:opacity-50"
          disabled={loading}
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
