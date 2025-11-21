import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { EncryptionService } from '@/lib/services/encryption.service';

const GHL_OAUTH_BASE = 'https://marketplace.gohighlevel.com';
const DEFAULT_SCOPES = 'conversations.readonly conversations.write conversations/message.readonly conversations/message.write contacts.readonly contacts.write locations.readonly users.readonly';

/**
 * Initiate GHL OAuth flow
 * Loads OAuth configuration from database
 *
 * Accepts optional POST body with scopes:
 * POST /api/ghl/oauth/authorize
 * { "scopes": "conversations.readonly contacts.write ..." }
 */
// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleOAuthAuthorize(request);
}

export async function POST(request: NextRequest) {
  return handleOAuthAuthorize(request);
}

async function handleOAuthAuthorize(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Load OAuth config from database
    const { data: config, error: configError } = await supabase
      .from('oauth_app_configs')
      .select('*')
      .eq('provider', 'ghl')
      .eq('created_by', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (configError) {
      console.error('Error fetching OAuth config:', configError);
      return NextResponse.json(
        { error: 'Failed to load OAuth configuration' },
        { status: 500 }
      );
    }

    // Check if GHL OAuth is configured
    if (!config || !config.client_id) {
      return NextResponse.json(
        { error: 'GHL OAuth not configured. Please configure your GHL app credentials in Settings first.' },
        { status: 400 }
      );
    }

    // Generate state parameter for CSRF protection
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
    })).toString('base64');

    // Build authorization URL
    const scopes = config.scopes || DEFAULT_SCOPES;
    const params = new URLSearchParams({
      client_id: config.client_id,
      redirect_uri: config.redirect_uri,
      response_type: 'code',
      scope: scopes,
      state,
    });

    const authUrl = `${GHL_OAUTH_BASE}/oauth/chooselocation?${params.toString()}`;

    // Return redirect URL for frontend to handle
    return NextResponse.json({
      success: true,
      authUrl,
      scopes,
    });

  } catch (error) {
    console.error('OAuth authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
