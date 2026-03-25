import { createServiceClient, extractToken, getUserFromToken } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/chats - List user's chats
export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data: chats, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ chats: chats || [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chats - Create new chat
export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const title = body.title || 'New Chat';
    const model = body.model || 'gpt-4o';

    const supabase = createServiceClient();
    const { data: chat, error } = await supabase
      .from('chats')
      .insert({
        user_id: user.id,
        title,
        model,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ chat }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
