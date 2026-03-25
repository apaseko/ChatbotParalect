import { createServiceClient, extractToken, getUserFromToken } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      user: profile || {
        id: user.id,
        email: user.email,
        is_anonymous: false,
        anonymous_questions_used: 0,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
