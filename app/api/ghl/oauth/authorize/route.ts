import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { EncryptionService } from '@/lib/services/encryption.service';

const GHL_OAUTH_BASE = 'https://marketplace.gohighlevel.com';
const DEFAULT_SCOPES = 'conversations.readonly conversations.write conversations/message.readonly conversations/message.write contacts.readonly contacts.write locations.readonly users.readonly';

/**
 * Initiate GHL OAuth flow for a specific agent
 * Loads OAuth configuration from database
 *
 * Query params:
 * GET /api/ghl/oauth/authorize?agentId=xxx
 *
 * Or POST body:
 * POST /api/ghl/oauth/authorize
 * { "agentId": "xxx" }
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

    // Get agentId from query params or body
    let agentId: string | null = request.nextUrl.searchParams.get('agentId');

    if (!agentId && request.method === 'POST') {
      try {
        const body = await request.json();
        agentId = body.agentId;
      } catch {
        // No body or invalid JSON
      }
    }

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required. Please specify which agent to connect to GHL.' },
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

    // Load OAuth config from database (platform-wide config)
    // First try user's config, then fall back to any active config
    let config = null;
    const { data: userConfig } = await supabase
      .from('oauth_app_configs')
      .select('*')
      .eq('provider', 'ghl')
      .eq('created_by', user.id)
      .eq('is_active', true)
      .maybeSingle();

    config = userConfig;

    // If no user config, try platform config (from platform admin)
    if (!config) {
      const { data: platformConfig } = await supabase
        .from('oauth_app_configs')
        .select('*')
        .eq('provider', 'ghl')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      config = platformConfig;
    }

    // Check if GHL OAuth is configured
    if (!config || !config.client_id) {
      return NextResponse.json(
        { error: 'GHL OAuth not configured. Please ask your platform administrator to configure GHL app credentials.' },
        { status: 400 }
      );
    }

    // Generate state parameter for CSRF protection - include agentId
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      agentId: agentId,
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
      agentId,
      agentName: agent.name,
    });

  } catch (error) {
    console.error('OAuth authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
