import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { revokeTokens } from '@/lib/ghl/oauth';

/**
 * Disconnect GoHighLevel integration
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

    // Get location ID before revoking
    const { data: tokens } = await supabase
      .from('ghl_oauth_tokens')
      .select('location_id')
      .eq('account_id', user.id)
      .single();

    if (!tokens) {
      return NextResponse.json(
        { error: 'No GHL connection found' },
        { status: 404 }
      );
    }

    // Revoke tokens
    await revokeTokens(user.id, tokens.location_id);

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
