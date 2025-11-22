import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ghlSessionStorage } from '@/lib/ghl/supabase-session-storage';

/**
 * Check GoHighLevel connection status for current user
 * Checks both legacy ghl_oauth_tokens table and new ghl_sessions table
 */
// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // First check the new ghl_sessions table (SDK-based)
    const { data: sessions, error: sessionsError } = await supabase
      .from('ghl_sessions')
      .select('location_id, company_id, expires_at, scope, user_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sessionsError && sessions) {
      const expiresAt = new Date(sessions.expires_at);
      const isExpired = expiresAt.getTime() < Date.now();

      return NextResponse.json({
        connected: !isExpired,
        locationId: sessions.location_id,
        expiresAt: sessions.expires_at,
        scopes: sessions.scope?.split(' ') || [],
        userType: sessions.user_type,
        source: 'sdk',
      });
    }

    // Fall back to legacy ghl_oauth_tokens table
    const { data: tokens, error: tokensError } = await supabase
      .from('ghl_oauth_tokens')
      .select('location_id, expires_at, scope')
      .eq('account_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokensError) {
      console.error('Error checking GHL tokens:', tokensError);
      return NextResponse.json({
        connected: false,
        locationId: null,
      });
    }

    if (!tokens) {
      return NextResponse.json({
        connected: false,
        locationId: null,
      });
    }

    // Check if token is expired
    const expiresAt = new Date(tokens.expires_at);
    const isExpired = expiresAt.getTime() < Date.now();

    return NextResponse.json({
      connected: !isExpired,
      locationId: tokens.location_id,
      expiresAt: tokens.expires_at,
      scopes: tokens.scope?.split(' ') || [],
      source: 'legacy',
    });

  } catch (error) {
    console.error('GHL status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
