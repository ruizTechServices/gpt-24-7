// app/chat/page.tsx
import { requireUser } from '@/lib/auth';
import ChatUI from '@/components/typescript/customized_components/ChatUI';

export default async function ChatPage() {
  await requireUser();
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Chat</h1>
      <ChatUI />
    </div>
  );
}
