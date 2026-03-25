import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = createServiceClient();

    const password = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const email = `anon-${Date.now()}-${Math.random().toString(36).slice(2)}@anonymous.local`;

    // 1. Create anonymous user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { is_anonymous: true },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 2. Create profile (non-blocking)
    try {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email!,
        display_name: 'Guest',
        is_anonymous: true,
        anonymous_questions_used: 0,
      });
    } catch {
      console.warn('Could not create profile — profiles table may not exist');
    }

    // 3. Sign in to get a real session token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      return NextResponse.json({ error: signInError?.message || 'Failed to generate session' }, { status: 500 });
    }

    return NextResponse.json({
      user: signInData.user,
      session: signInData.session,
    });
  } catch (err) {
    console.error('Anonymous login error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
