import { createServiceClient, extractToken, getUserFromToken } from '@/lib/supabase/server';
import { streamLLM } from '@/lib/llm';
import { NextResponse, NextRequest } from 'next/server';
import type { LLMModel } from '@/types';

// GET /api/chats/[chatId]/messages - Get messages for a chat
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/chats/[chatId]/messages'>
) {
  try {
    const { chatId } = await ctx.params;
    const token = extractToken(_req);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Verify chat belongs to user
    const { data: chat } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single();

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chats/[chatId]/messages - Send message and stream response
export async function POST(
  _req: NextRequest,
  ctx: RouteContext<'/api/chats/[chatId]/messages'>
) {
  try {
    const { chatId } = await ctx.params;
    const token = extractToken(_req);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Verify chat belongs to user
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ 
        error: `Chat query failed: ${chatError?.message || 'Not found'} (ID: ${chatId})` 
      }, { status: 404 });
    }

    // Check anonymous question limit
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_anonymous, anonymous_questions_used')
      .eq('id', user.id)
      .single();

    if (profile?.is_anonymous && (profile.anonymous_questions_used || 0) >= 3) {
      return NextResponse.json(
        { error: 'Anonymous question limit reached. Please sign up to continue.' },
        { status: 403 }
      );
    }

    const body = await _req.json();
    const { content, image_urls = [], model } = body;

    if (!content && image_urls.length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Save user message
    const { data: userMessage, error: msgError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        role: 'user',
        content: content || '',
        image_urls,
      })
      .select()
      .single();

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }
 
    // Increment anonymous questions count synchronously to ensure UI updates immediately
    if (profile?.is_anonymous) {
      await supabase
        .from('profiles')
        .update({
          anonymous_questions_used: (profile.anonymous_questions_used || 0) + 1,
        })
        .eq('id', user.id);
    }

    // Get all messages for context
    const { data: allMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    // Get document context
    const { data: documents } = await supabase
      .from('documents')
      .select('content_text, filename')
      .eq('chat_id', chatId)
      .not('content_text', 'is', null);

    let documentContext: string | undefined;
    if (documents && documents.length > 0) {
      documentContext = documents
        .map((doc) => `--- Document: ${doc.filename} ---\n${doc.content_text}`)
        .join('\n\n');
    }

    // Auto-title the chat if it's the first message
    if (allMessages && allMessages.length <= 1) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      await supabase
        .from('chats')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', chatId);
    }

    // Use the chat's model or override from request
    const selectedModel: LLMModel = model || chat.model || 'gpt-4o';

    // Stream the response with a background callback to save it when complete
    const stream = await streamLLM(
      selectedModel,
      allMessages || [],
      documentContext,
      (fullContent: string) => {
        // Run in background without awaiting, catch any errors quietly
        (async () => {
          if (!fullContent) return;

          // Save assistant message
          await supabase.from('messages').insert({
            chat_id: chatId,
            role: 'assistant',
            content: fullContent,
            image_urls: [],
          });



          // Update chat timestamp
          await supabase
            .from('chats')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', chatId);
        })().catch((err) => {
          console.error('Background message save failed:', err);
        });
      }
    );

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-User-Message-Id': userMessage.id,
      },
    });
  } catch (error: any) {
    console.error('Message error:', error);
    // Return a 200 with error field to prevent Railway/Cloudflare from intercepting 500s as 503 Service Unavailable
    return NextResponse.json({ 
      error: `API Error: ${error?.message || String(error)}`,
      details: error?.error || null
    }, { status: 200 });
  }
}
