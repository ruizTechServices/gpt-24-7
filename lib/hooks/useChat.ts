// lib/hooks/useChat.ts
'use client';

import { useState } from 'react';
// TODO 1: Import the Supabase client.
// import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type Msg = { role: 'user' | 'assistant'; content: string };

/*
  TODO 2: Set up the database for encryption.

  First, enable the 'pgsodium' extension in your Supabase project's SQL editor.
  > CREATE EXTENSION IF NOT EXISTS pgsodium WITH SCHEMA pgsodium;

  Next, create a new secret key in the Supabase Vault and get its UUID.
  We'll call it 'chat_encryption_key'.

  Then, create the 'chat_messages' table. The 'content' column must be of type 'bytea' to store encrypted data.
  > CREATE TABLE public.chat_messages (
  >   id uuid DEFAULT gen_random_uuid() NOT NULL,
  >   user_id uuid NOT NULL,
  >   created_at timestamp with time zone DEFAULT now() NOT NULL,
  >   role text NOT NULL,
  >   content bytea NOT NULL,
  >   CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  >   CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
  > );

  Finally, set up Row Level Security (RLS). Users must only access their own messages.
  > ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
  > CREATE POLICY "Users can manage their own chat messages" ON public.chat_messages
  > FOR ALL USING (auth.uid() = user_id);
*/

export function useChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [override, setOverride] = useState<{ provider?: string; model?: string }>({});
  // TODO 3: Instantiate the Supabase client.
  // const supabase = createSupabaseBrowserClient();

  // TODO 4: Load and decrypt chat history on mount.
  /*
  Here is the SQL for the `get_decrypted_chat_history` function. Run this in your Supabase SQL editor.
  It retrieves and decrypts all messages for the currently logged-in user.

  ---
  CREATE OR REPLACE FUNCTION get_decrypted_chat_history()
  RETURNS TABLE (role text, content text)
  LANGUAGE sql
  SECURITY DEFINER -- This is critical for accessing the key from the Vault.
  AS $$
    -- Decrypt the content using the key stored in Vault.
    -- Replace 'YOUR_KEY_UUID_HERE' with the actual UUID of your 'chat_encryption_key' from Supabase Vault.
    SELECT
      m.role,
      convert_from(pgsodium.crypto_aead_det_decrypt(m.content, m.user_id::text::bytea, (SELECT secret FROM pgsodium.decrypted_key WHERE id = 'YOUR_KEY_UUID_HERE')), 'utf8') AS content
    FROM
      public.chat_messages AS m
    WHERE
      m.user_id = auth.uid()
    ORDER BY
      m.created_at ASC;
  $$;
  ---

  useEffect(() => {
    const fetchAndDecryptHistory = async () => {
      // Now, when you call this RPC, it will execute the function above.
      const { data, error } = await supabase.rpc('get_decrypted_chat_history');

      if (error) {
        console.error('Error fetching chat history:', error);
        return;
      }
      if (data) {
        setMessages(data as Msg[]);
      }
    };

    fetchAndDecryptHistory();
  }, [supabase]);
  */

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg) return;

    const userMessage: Msg = { role: 'user', content: msg };
    setMessages((m) => [...m, userMessage]);
    setInput('');

    // TODO 5: Encrypt and insert the user's message.
    /*
    Here is the SQL for the `add_encrypted_chat_message` function. Run this in your Supabase SQL editor.
    It takes the message role and content, encrypts the content, and inserts it into the database for the current user.

    ---
    CREATE OR REPLACE FUNCTION add_encrypted_chat_message(p_role text, p_content text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER -- This is critical for accessing the key from the Vault.
    AS $$
    DECLARE
      key_secret bytea := (SELECT secret FROM pgsodium.decrypted_key WHERE id = 'YOUR_KEY_UUID_HERE');
      current_user_id uuid := auth.uid();
    BEGIN
      -- Encrypt the content using the key from the Vault and the user's ID as additional authenticated data (AAD).
      -- The AAD ensures that the encrypted data is tied to the specific user, enhancing security.
      INSERT INTO public.chat_messages (user_id, role, content)
      VALUES (
        current_user_id,
        p_role,
        pgsodium.crypto_aead_det_encrypt(
          convert_to(p_content, 'utf8'),
          convert_to(current_user_id::text, 'utf8'),
          key_secret
        )
      );
    END;
    $$;
    ---

    // Now, when you call this RPC, it will execute the function above.
    await supabase.rpc('add_encrypted_chat_message', {
      p_role: userMessage.role,
      p_content: userMessage.content,
    });
    */

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: msg, override }),
      });

      const json = await res.json();

      if (!res.ok) {
        const errorResponse: Msg = { role: 'assistant', content: `[${json.error || 'Error'}]` };
        setMessages((m) => [...m, errorResponse]);
        return;
      }

      const assistantMessage: Msg = { role: 'assistant', content: json.reply };
      setMessages((m) => [...m, assistantMessage]);

      // TODO 6: Encrypt and insert the assistant's response.
      /*
      await supabase.rpc('add_encrypted_chat_message', {
        p_role: assistantMessage.role,
        p_content: assistantMessage.content,
      });
      */

    } catch (err) {
        const error = err instanceof Error ? err.message : 'An unexpected error occurred';
        setMessages((m) => [...m, { role: 'assistant', content: `[${error}]` }]);
    }
  };

  // TODO 7: Implement the download functionality.
  const downloadChatHistory = () => {
    // Convert the messages array to a JSONL string.
    const jsonl = messages.map(m => JSON.stringify(m)).join('\n');
    // Create a Blob from the string.
    const blob = new Blob([jsonl], { type: 'application/jsonl' });
    // Create a temporary URL for the Blob.
    const url = URL.createObjectURL(blob);
    // Create a temporary link element to trigger the download.
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat-history.jsonl';
    document.body.appendChild(a);
    a.click();
    // Clean up by removing the link and revoking the URL.
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  return {
    messages,
    input,
    handleInputChange,
    sendMessage,
    setOverride,
    // TODO 8: Expose the download function.
    // Add a button to your ChatUI component that calls this.
    downloadChatHistory,
  };
}
