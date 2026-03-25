import 'server-only';
import { streamOpenAI } from './openai';
import { streamGemini } from './gemini';
import type { Message, LLMModel } from '@/types';

export async function streamLLM(
  model: LLMModel,
  messages: Message[],
  documentContext?: string
): Promise<ReadableStream<Uint8Array>> {
  switch (model) {
    case 'gpt-4o':
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }
      return streamOpenAI(messages, documentContext);
    case 'gemini-2.0-flash':
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
      }
      return streamGemini(messages, documentContext);
    default:
      throw new Error(`Unsupported model: ${model}`);
  }
}

export function getAvailableModels(): { id: LLMModel; name: string; available: boolean }[] {
  return [
    {
      id: 'gpt-4o',
      name: process.env.OPENAI_MODEL || 'Llama 3.2 Vision',
      available: !!process.env.OPENAI_API_KEY,
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      available: !!process.env.GEMINI_API_KEY,
    },
  ];
}
