import { getAvailableModels } from '@/lib/llm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const models = getAvailableModels();
  return NextResponse.json({ models });
}
