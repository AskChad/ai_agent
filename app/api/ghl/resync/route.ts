import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { EncryptionService } from '@/lib/services/encryption.service';

const GHL_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';

// Type for GHL session data
interface GHLSession {
  id: string;
  agent_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  location_id?: string;
  company_id?: string;
  user_type?: string;
  scope?: string;
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Resync GoHighLevel connection for a specific agent
 * This refreshes the access token using the stored refresh token
 *
 * POST /api/ghl/resync?agentId=xxx
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = getAdminClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get agentId from query params
    const agentId = request.nextUrl.searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    // Verify the agent belongs to this user
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found or access denied' },
        { status: 404 }
      );
    }

    // Get the GHL session for this agent (use admin client to bypass RLS)
    // Using type assertion to bypass strict typing
    const sessionQuery = adminClient.from('ghl_sessions') as ReturnType<typeof adminClient.from>;
    const { data: sessionData, error: sessionError } = await sessionQuery
      .select('*')
      .eq('agent_id', agentId)
      .maybeSingle();

    const session = sessionData as GHLSession | null;

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'No GHL connection found for this agent' },
        { status: 404 }
      );
    }

    // Get OAuth config to get client credentials
    const { data: oauthConfig } = await supabase
      .from('oauth_app_configs')
      .select('*')
      .eq('provider', 'ghl')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!oauthConfig || !oauthConfig.client_id) {
      return NextResponse.json(
        { error: 'GHL OAuth not configured' },
        { status: 400 }
      );
    }

    // Decrypt the refresh token
    let refreshToken = session.refresh_token;

    // Try to decrypt if it looks encrypted
    if (refreshToken && refreshToken.includes(':')) {
      try {
        const encryption = new EncryptionService();
        refreshToken = encryption.decrypt(refreshToken);
      } catch (e) {
        // If decryption fails, use as-is (might be stored unencrypted)
        console.warn('Failed to decrypt refresh token, using as-is');
      }
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token available. Please reconnect to GHL.' },
        { status: 400 }
      );
    }

    // Decrypt client secret
    let clientSecret = oauthConfig.client_secret;
    if (clientSecret && clientSecret.includes(':')) {
      try {
        const encryption = new EncryptionService();
        clientSecret = encryption.decrypt(clientSecret);
      } catch (e) {
        console.warn('Failed to decrypt client secret, using as-is');
      }
    }

    // Refresh the token
    const tokenResponse = await fetch(GHL_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: oauthConfig.client_id,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('GHL token refresh failed:', errorData);
      return NextResponse.json(
        { error: 'Failed to refresh GHL token. You may need to reconnect.' },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();

    // Encrypt the new tokens
    const encryption = new EncryptionService();
    const encryptedAccessToken = encryption.encrypt(tokenData.access_token);
    const encryptedRefreshToken = encryption.encrypt(tokenData.refresh_token);

    // Calculate new expiration
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    // Update the session with new tokens
    // Using type assertion to bypass strict typing
    const updateQuery = adminClient.from('ghl_sessions') as ReturnType<typeof adminClient.from>;
    const { error: updateError } = await updateQuery
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('agent_id', agentId);

    if (updateError) {
      console.error('Error updating GHL session:', updateError);
      return NextResponse.json(
        { error: 'Failed to save refreshed tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully resynced GHL connection for agent "${agent.name}"`,
      agentId,
      expiresAt,
    });

  } catch (error) {
    console.error('Resync error:', error);
    return NextResponse.json(
      { error: 'Failed to resync GHL connection' },
      { status: 500 }
    );
  }
}
