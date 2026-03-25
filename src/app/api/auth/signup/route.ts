import { createServiceClient, extractToken, getUserFromToken } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Create user via admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 2. Create profile (non-blocking — don't fail signup if profiles table is missing)
    try {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email,
        display_name: email.split('@')[0],
        is_anonymous: false,
      });
    } catch {
      console.warn('Could not create profile — profiles table may not exist');
    }

    // 3. Sign in to get a session token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return NextResponse.json({ error: signInError.message }, { status: 400 });
    }

    // 4. Check if there's an anonymous session to merge
    const token = extractToken(request);
    if (token) {
      try {
        const anonUser = await getUserFromToken(token);
        if (anonUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_anonymous')
            .eq('id', anonUser.id)
            .single();

          if (profile?.is_anonymous) {
            await supabase
              .from('chats')
              .update({ user_id: data.user.id })
              .eq('user_id', anonUser.id);

            await supabase.auth.admin.deleteUser(anonUser.id);
          }
        }
      } catch {
        console.warn('Anonymous merge failed — skipping');
      }
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: signInData.session,
    });
  } catch (err) {
    console.error('Signup error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
