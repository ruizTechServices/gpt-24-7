// components/typescript/customized_components/BuyButton.tsx
'use client';
import { useState } from 'react';

export default function BuyButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button
      className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      disabled={loading}
      onClick={async () => {
        try {
          setLoading(true);
          const res = await fetch('/api/payment/checkout', { method: 'POST' });
          const { url, error } = await res.json();
          if (error || !url) throw new Error(error || 'No checkout URL');
          window.location.href = url;
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? 'Redirecting…' : 'Buy 24‑Hour Access ($1)'}
    </button>
  );
}
