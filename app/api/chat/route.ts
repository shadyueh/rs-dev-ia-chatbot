import { convertToModelMessages, streamText, type UIMessage } from 'ai';

export async function POST(req: Request) {
  let body: { messages?: UIMessage[] };

  try {
    body = (await req.json()) as { messages?: UIMessage[] };
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.messages)) {
    return Response.json({ error: 'Missing messages' }, { status: 400 });
  }

  try {
    const result = streamText({
      model: 'openai/gpt-5-mini',
      system: 'Você é um assistente útil.',
      messages: await convertToModelMessages(body.messages),
    });

    return result.toUIMessageStreamResponse();
  } catch {
    return Response.json({ error: 'Failed to start chat stream' }, { status: 500 });
  }
}
