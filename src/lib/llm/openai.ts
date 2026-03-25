import 'server-only';
import OpenAI from 'openai';
import type { Message } from '@/types';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build',
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }
  return openaiClient;
}

interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | OpenAI.Chat.Completions.ChatCompletionContentPart[];
}

export async function streamOpenAI(
  messages: Message[],
  documentContext?: string,
  onComplete?: (fullContent: string) => void
): Promise<ReadableStream<Uint8Array>> {
  const formattedMessages: LLMMessage[] = [];

  // Add system message with document context if available
  if (documentContext) {
    formattedMessages.push({
      role: 'system',
      content: `You are a helpful assistant. Use the following document context to answer questions when relevant:\n\n${documentContext}`,
    });
  } else {
    formattedMessages.push({
      role: 'system',
      content: 'You are a helpful assistant. Respond in markdown format when appropriate.',
    });
  }

  // Convert messages to OpenAI format
  for (const msg of messages) {
    if (msg.image_urls && msg.image_urls.length > 0 && msg.role === 'user') {
      const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        { type: 'text', text: msg.content },
      ];
      for (const url of msg.image_urls) {
        parts.push({
          type: 'image_url',
          image_url: { url },
        });
      }
      formattedMessages.push({ role: msg.role, content: parts });
    } else {
      formattedMessages.push({ role: msg.role, content: msg.content });
    }
  }

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: formattedMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    stream: true,
    max_tokens: 4096,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let fullText = '';
      try {
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            fullText += content;
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
      } finally {
        if (onComplete && fullText) {
          onComplete(fullText);
        }
      }
    },
  });
}
