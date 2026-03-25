import 'server-only';
import { GoogleGenerativeAI, Content, Part } from '@google/generative-ai';
import type { Message } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function streamGemini(
  messages: Message[],
  documentContext?: string
): Promise<ReadableStream<Uint8Array>> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const contents: Content[] = [];

  // Add document context as a system-like first message
  if (documentContext) {
    contents.push({
      role: 'user',
      parts: [
        {
          text: `Use the following document context to answer questions when relevant:\n\n${documentContext}\n\nAcknowledge you have this context.`,
        },
      ],
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'I have the document context and will use it to answer your questions.' }],
    });
  }

  // Convert messages to Gemini format
  for (const msg of messages) {
    const parts: Part[] = [{ text: msg.content }];

    if (msg.image_urls && msg.image_urls.length > 0 && msg.role === 'user') {
      for (const url of msg.image_urls) {
        // For base64 data URLs
        if (url.startsWith('data:')) {
          const [meta, data] = url.split(',');
          const mimeType = meta.split(':')[1].split(';')[0];
          parts.push({
            inlineData: { mimeType, data },
          });
        }
      }
    }

    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts,
    });
  }

  const result = await model.generateContentStream({ contents });
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const content = chunk.text();
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
        );
        controller.close();
      }
    },
  });
}
