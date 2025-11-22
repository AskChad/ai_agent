import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/role
 * Get current user's role
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await adminSupabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch user role' }, { status: 500 });
    }

    // If no profile exists, create one with default 'user' role
    if (!profile) {
      const { error: insertError } = await adminSupabase
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email,
          role: 'user',
        });

      if (insertError) {
        console.error('Error creating user profile:', insertError);
      }

      return NextResponse.json({
        role: 'user',
        email: user.email,
        isPlatformAdmin: false,
      });
    }

    return NextResponse.json({
      role: profile.role,
      email: user.email,
      isPlatformAdmin: profile.role === 'platform_admin',
    });

  } catch (error) {
    console.error('Get user role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
