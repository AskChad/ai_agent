import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ghlSessionStorage } from '@/lib/ghl/supabase-session-storage';

/**
 * Disconnect GoHighLevel integration
 * Removes session from both legacy and SDK tables
 */
// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let disconnected = false;

    // First try to disconnect from SDK sessions table
    const { data: sessions } = await supabase
      .from('ghl_sessions')
      .select('location_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessions) {
      await ghlSessionStorage.delete(sessions.location_id);
      disconnected = true;
    }

    // Also try to disconnect from legacy table
    const { data: legacyTokens } = await supabase
      .from('ghl_oauth_tokens')
      .select('location_id')
      .eq('account_id', user.id)
      .single();

    if (legacyTokens) {
      await supabase
        .from('ghl_oauth_tokens')
        .delete()
        .eq('account_id', user.id);
      disconnected = true;
    }

    if (!disconnected) {
      return NextResponse.json(
        { error: 'No GHL connection found' },
        { status: 404 }
      );
    }

    // Clear GHL location ID from account
    await supabase
      .from('accounts')
      .update({ ghl_location_id: null })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Successfully disconnected from GoHighLevel',
    });

  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
