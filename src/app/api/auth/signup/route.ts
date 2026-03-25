import { createServiceClient, extractToken, getUserFromToken } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Create profile
    await supabase.from('profiles').insert({
      id: data.user.id,
      email: data.user.email,
      display_name: email.split('@')[0],
      is_anonymous: false,
    });

    // Sign the user in to get a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return NextResponse.json({ error: signInError.message }, { status: 400 });
    }

    // Check if there's an anonymous session to merge
    const token = extractToken(request);
    if (token) {
      const anonUser = await getUserFromToken(token);
      if (anonUser) {
        // Transfer anonymous chats to new user
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

          // Clean up anonymous profile
          await supabase.auth.admin.deleteUser(anonUser.id);
        }
      }
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: signInData.session,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
