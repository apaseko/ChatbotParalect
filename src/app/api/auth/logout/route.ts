import { NextResponse } from 'next/server';

export async function POST() {
  // Client handles sign out via Supabase client
  // This endpoint is for any server-side cleanup
  return NextResponse.json({ success: true });
}
