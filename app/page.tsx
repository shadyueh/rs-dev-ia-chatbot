'use client';

import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  const { messages, sendMessage, setMessages, status, stop, error } = useChat();
  const listRef = useRef<HTMLDivElement>(null);

  const isBusy = status === 'submitted' || status === 'streaming';

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

  // Keep the latest message in view while the conversation grows.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

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
      <div className="flex w-full max-w-2xl flex-1 flex-col gap-6">
        <div
          ref={listRef}
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto"
        >
          {renderedMessages.map(m => (
            <div key={m.id} className="whitespace-pre-wrap">
              <span className="font-semibold">
                {m.role === 'user' ? 'Você' : 'Bot'}:
              </span>{' '}
              <span>{m.text}</span>
            </div>
          ))}

          {isBusy && (
            <div className="text-zinc-400">
              <span className="font-semibold">Bot:</span> digitando…
            </div>
          )}
        </div>

        {error && (
          <div
            className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            Erro: {error.message}
          </div>
        )}

        <form
          className="mt-auto flex gap-2"
          onSubmit={e => {
            e.preventDefault();
            if (isBusy) return;
            const text = input.trim();
            if (!text) return;
            sendMessage({ text });
            setInput('');
          }}
        >
          <input
            className="w-full rounded border border-zinc-300 bg-transparent p-3 disabled:opacity-50"
            value={input}
            placeholder="Digite sua mensagem..."
            disabled={isBusy}
            onChange={e => setInput(e.currentTarget.value)}
          />
          {isBusy ? (
            <button
              type="button"
              className="rounded border border-zinc-300 px-4"
              onClick={() => stop()}
            >
              Parar
            </button>
          ) : (
            <button
              type="submit"
              className="rounded bg-zinc-900 px-4 text-white disabled:opacity-50"
              disabled={input.trim() === ''}
            >
              Enviar
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
