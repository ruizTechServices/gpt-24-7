// components/ChatUI.tsx
'use client';

import { useState } from 'react';
import ModelSelect from './ModelSelect';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function ChatUI() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [override, setOverride] = useState<{ provider?: string; model?: string }>({});

  async function send() {
    const msg = input.trim();
    if (!msg) return;
    setMessages((m) => [...m, { role: 'user', content: msg }]);
    setInput('');

    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: msg, override }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessages((m) => [...m, { role: 'assistant', content: `[${json.error || 'Error'}]` }]);
      return;
    }
    setMessages((m) => [...m, { role: 'assistant', content: json.reply }]);
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <ModelSelect onChange={setOverride} />
        <a className="text-sm underline" href="/dashboard">Session</a>
      </div>

      <div className="border rounded bg-white p-4 h-[60vh] overflow-auto">
        {messages.length === 0 && (
          <div className="text-neutral-500 text-sm">Ask anything…</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`my-2 ${m.role === 'user' ? 'text-right' : ''}`}>
            <div
              className={`inline-block px-3 py-2 rounded ${
                m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-black'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          className="flex-1 border rounded px-3 py-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button onClick={send} className="px-4 py-2 rounded bg-black text-white">
          Send
        </button>
      </div>
    </div>
  );
}
