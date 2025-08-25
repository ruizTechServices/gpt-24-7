// app/login/page.tsx
'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [origin, setOrigin] = useState<string>('');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set origin once component mounts on client
    setOrigin(window.location.origin);
    // Initialize local session state
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    
    // Check if already logged in and redirect to dashboard
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.push('/dashboard');
      }
    }); 

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setSession(session);
        router.push('/dashboard');
      }
      if (event === 'SIGNED_OUT') {
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <div className="max-w-md mx-auto dark:bg-neutral-900 bg-white border rounded p-6 space-y-4">
      <h2 className="text-xl font-semibold">Sign in / Sign up</h2>

      {!session ? (
        loading ? (
          <div>loading...</div>
        ) : (
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google']}
            redirectTo={origin ? `${origin}/auth/callback` : undefined}
          />
        )
      ) : null}

      <button
        className="text-sm underline disabled:opacity-50"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          await supabase.auth.signOut();
          window.location.href = '/';
        }}
      >
        Sign out
      </button>
    </div>
  );
}