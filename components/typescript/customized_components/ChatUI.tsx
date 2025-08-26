// components/ChatUI.tsx
'use client';

import ModelSelect from './ModelSelect';
import { useChat } from '@/lib/hooks/useChat';

export default function ChatUI() {
  const {
    messages,
    input,
    handleInputChange,
    sendMessage,
    setOverride,
    downloadChatHistory,
  } = useChat();

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <ModelSelect onChange={setOverride} />
        <div className="flex items-center gap-4">
          <button onClick={downloadChatHistory} className="text-sm underline">
            Download History
          </button>
          <a className="text-sm underline" href="/dashboard">Session</a>
        </div>
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
          onChange={handleInputChange}
          placeholder="Type your message…"
          className="flex-1 border rounded px-3 py-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button onClick={sendMessage} className="px-4 py-2 rounded bg-black text-white">
          Send
        </button>
      </div>
    </div>
  );
}
