'use client';

import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'chat.messages.v1';

function isUIMessageArray(value: unknown): value is UIMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        item &&
        typeof item === 'object' &&
        'id' in item &&
        'role' in item &&
        'parts' in item,
    )
  );
}

function sanitizeForStorage(messages: UIMessage[]): UIMessage[] {
  return messages.map(message => ({
    id: message.id,
    role: message.role,
    parts: message.parts
      .filter(part => part.type === 'text')
      .map(part => ({ type: 'text' as const, text: part.text })),
  }));
}

export default function Home() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, setMessages, status } = useChat();

  // Load messages from localStorage after mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed: unknown = JSON.parse(raw);
      if (isUIMessageArray(parsed)) {
        setMessages(parsed);
      }
    } catch {
      // Ignore storage/parse errors.
    }
  }, [setMessages]);

  // Persist messages only at checkpoints (after sending and once complete),
  // skipping per-token writes during streaming.
  useEffect(() => {
    if (messages.length === 0 || status === 'streaming') return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(sanitizeForStorage(messages)),
      );
    } catch {
      // Ignore quota and serialization errors.
    }
  }, [messages, status]);

  const renderedMessages = useMemo(
    () =>
      messages.map(message => {
        const text = message.parts
          .map(part => (part.type === 'text' ? part.text : ''))
          .join('');

        return {
          id: message.id,
          role: message.role,
          text,
        };
      }),
    [messages],
  );

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-10">
      <div className="w-full max-w-2xl flex-1 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {renderedMessages.map(m => (
            <div key={m.id} className="whitespace-pre-wrap">
              <span className="font-semibold">{m.role === 'user' ? 'Você' : 'Bot'}:</span>{' '}
              <span>{m.text}</span>
            </div>
          ))}
        </div>

        <form
          className="mt-auto"
          onSubmit={e => {
            e.preventDefault();
            const text = input.trim();
            if (!text) return;
            sendMessage({ text });
            setInput('');
          }}
        >
          <input
            className="w-full rounded border border-zinc-300 bg-transparent p-3"
            value={input}
            placeholder="Digite sua mensagem..."
            onChange={e => setInput(e.currentTarget.value)}
          />
        </form>
      </div>
    </div>
  );
}
