import { convertToModelMessages, streamText, type UIMessage } from 'ai';

export async function POST(req: Request) {
  const body = (await req.json()) as { messages?: UIMessage[] };

  if (!Array.isArray(body.messages)) {
    return Response.json({ error: 'Missing messages' }, { status: 400 });
  }

  const result = streamText({
    model: 'openai/gpt-5-mini',
    system: 'Você é um assistente útil.',
    messages: await convertToModelMessages(body.messages),
  });

  return result.toUIMessageStreamResponse();
}
