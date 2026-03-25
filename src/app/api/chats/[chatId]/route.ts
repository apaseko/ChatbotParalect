import { createServiceClient, extractToken, getUserFromToken } from '@/lib/supabase/server';
import { NextResponse, NextRequest } from 'next/server';

// GET /api/chats/[chatId] - Get single chat
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/chats/[chatId]'>
) {
  try {
    const { chatId } = await ctx.params;
    const token = extractToken(_req);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data: chat, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single();

    if (error || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ chat });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/chats/[chatId] - Update chat
export async function PATCH(
  _req: NextRequest,
  ctx: RouteContext<'/api/chats/[chatId]'>
) {
  try {
    const { chatId } = await ctx.params;
    const token = extractToken(_req);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await _req.json();
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.model !== undefined) updates.model = body.model;
    updates.updated_at = new Date().toISOString();

    const supabase = createServiceClient();
    const { data: chat, error } = await supabase
      .from('chats')
      .update(updates)
      .eq('id', chatId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ chat });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/chats/[chatId] - Delete chat
export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/chats/[chatId]'>
) {
  try {
    const { chatId } = await ctx.params;
    const token = extractToken(_req);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
