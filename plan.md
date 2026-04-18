## Plan: Chatbot Streaming (AI SDK + Next App Router)

Implement a minimal chatbot UI (message list + single text input) on the existing home page, backed by a Next.js Route Handler that streams assistant text using Vercel AI SDK. Use Vercel AI Gateway with the user-chosen model `openai/gpt-5-mini` and persist messages client-side in `localStorage` (no DB, no extra UI).

**Steps**
1. Dependencies and env (*blocks all other steps*)
   1) Add `@ai-sdk/react` to dependencies (project uses npm via `package-lock.json`).
   2) Add `AI_GATEWAY_API_KEY` to `.env.local` (not committed).
   3) Validate the model ID exists in AI Gateway by listing models (if missing, pick the newest `openai/` model from the list).
2. Backend: streaming chat endpoint (*depends on step 1*)
   1) Create `app/api/chat/route.ts` with a `POST(req: Request)` handler.
   2) Parse `{ messages }` from the JSON body as `UIMessage[]`.
   3) Call `streamText` with:
      - `model: 'openai/gpt-5-mini'` (AI Gateway string model)
      - `system: 'Você é um assistente útil.'` (simple system prompt)
      - `messages: await convertToModelMessages(messages)`
   4) Return `result.toUIMessageStreamResponse()` so the client can consume UI-message streaming.
   5) Keep scope minimal: no tools, no attachments, no auth, no DB persistence.
3. Frontend: minimal UI on home page (*depends on step 1; can be done in parallel with step 2*)
   1) Update `app/page.tsx` to a client component and implement:
      - message list rendering from `messages` (render only `text` parts)
      - a single controlled `<input>` and `<form onSubmit>` that calls `sendMessage({ text })`
      - no extra controls (no clear button, no settings, no additional pages)
   2) Use `useChat()` (default transport hits `/api/chat`). If necessary for type/behavior, switch to explicit `transport: new DefaultChatTransport({ api: '/api/chat' })`.
4. Client-side persistence via localStorage (*depends on step 3*)
   1) On mount, read persisted messages from `localStorage` and call `setMessages(storedMessages)`.
   2) Persist messages back to `localStorage`:
      - on each completed assistant response (`onFinish`) and
      - after sending a user message (to avoid losing the message on refresh while streaming).
   3) Ensure persistence does not cause hydration mismatch: initial render uses empty list; storage rehydration happens after mount.
5. Verification (*after steps 2–4*)
   1) Typecheck: `npm run build` (or `npx tsc -p tsconfig.json` if preferred).
   2) Runtime: `npm run dev`, open `/`, send a message, confirm assistant streams tokens in real time.
   3) Refresh the page, confirm previous messages are restored from `localStorage`.

**Relevant files**
- `app/api/chat/route.ts` — new Route Handler; uses `streamText`, `convertToModelMessages`, `toUIMessageStreamResponse`.
- `app/page.tsx` — replace Hello World with minimal chat UI using `useChat`, `sendMessage`, `messages`, `setMessages`.
- `.env.local` — add `AI_GATEWAY_API_KEY` (local only).
- `package.json` / lockfile — add `@ai-sdk/react` dependency.

**Verification**
1. Confirm model availability: call AI Gateway model list and verify `openai/gpt-5-mini` exists.
2. `npm run build` to catch TS/runtime edge issues with Next 16 route handlers.
3. Manual smoke: send message, observe streaming; refresh, observe persisted history.

**Decisions**
- Provider: Vercel AI Gateway (`AI_GATEWAY_API_KEY`).
- Model: `openai/gpt-5-mini` (user-provided).
- UX scope: single page, single text input, message list only; no tools, no auth, no DB.
- Persistence: browser-only via `localStorage` using `useChat().setMessages`.

**Further Considerations**
1. If you later want multi-chat history, we can introduce a `chatId` route segment and server-side storage; for now we keep a single persisted thread per browser.
2. If you want to reduce payload size, we can send only the last message via `prepareSendMessagesRequest`, but that requires server-side storage of prior messages; out of scope for this MVP.