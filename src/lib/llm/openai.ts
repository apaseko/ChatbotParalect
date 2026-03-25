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

  const selectedModel = process.env.OPENAI_MODEL || 'gpt-4o';
  // We assume a model supports vision if it's explicitly gpt-4o or contains vision/gemini/gemma-3/pixtral/vl/llama-3.2
  const isVisionModel = selectedModel === 'gpt-4o' || 
                        selectedModel.includes('vision') || 
                        selectedModel.includes('gemini') || 
                        selectedModel.includes('gemma-3') ||
                        selectedModel.includes('pixtral') ||
                        selectedModel.includes('vl') ||
                        selectedModel.includes('llama-3.2');
  
  // Some models (Gemma, some Gemini) on OpenRouter don't support the 'system' role
  const supportsSystem = !selectedModel.includes('gemma') && !selectedModel.includes('gemini');

  let systemPrompt = '';

  // Add system message or extract it for merging
  if (documentContext) {
    systemPrompt = `You are a helpful assistant. Use the following document context to answer questions when relevant:\n\n${documentContext}\n\nRespond in the same language the user uses. Если пользователь пишет на русском, отвечай на русском.`;
  } else {
    systemPrompt = 'You are a helpful assistant. Always respond in the same language the user uses. Если пользователь пишет на русском, обязательно отвечай на русском. Respond in markdown format when appropriate.';
  }

  if (supportsSystem) {
    formattedMessages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  // Convert messages to OpenAI format
  let firstUserMsgProcessed = false;
  for (const msg of messages) {
    let content: string | OpenAI.Chat.Completions.ChatCompletionContentPart[] = msg.content;
    
    // Merge system prompt into first user message if system role isn't supported
    if (!supportsSystem && !firstUserMsgProcessed && msg.role === 'user') {
      content = `[System Instructions: ${systemPrompt}]\n\nUser Message: ${msg.content}`;
      firstUserMsgProcessed = true;
    }

    if (msg.image_urls && msg.image_urls.length > 0 && msg.role === 'user' && isVisionModel) {
      const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        { type: 'text', text: typeof content === 'string' ? content : msg.content },
      ];
      for (const url of msg.image_urls) {
        parts.push({
          type: 'image_url',
          image_url: { url },
        });
      }
      formattedMessages.push({ role: msg.role, content: parts });
    } else {
      formattedMessages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: content as string });
    }
  }

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: selectedModel,
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
