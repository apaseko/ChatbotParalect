import { getAvailableModels } from '@/lib/llm';
import { NextResponse } from 'next/server';

export async function GET() {
  const models = getAvailableModels();
  return NextResponse.json({ models });
}
