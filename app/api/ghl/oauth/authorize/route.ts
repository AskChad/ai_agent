import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { EncryptionService } from '@/lib/services/encryption.service';

const GHL_OAUTH_BASE = 'https://marketplace.gohighlevel.com';
const DEFAULT_SCOPES = 'conversations.readonly conversations.write conversations/message.readonly conversations/message.write contacts.readonly contacts.write locations.readonly users.readonly';

/**
 * Initiate GHL OAuth flow for a specific agent
 * Uses per-agent private integration config if available, otherwise falls back to shared config
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
    const adminSupabase = await createAdminClient();

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
      .select('id, name, account_id')
      .eq('id', agentId)
      .eq('account_id', user.id)
      .maybeSingle();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found or access denied' },
        { status: 404 }
      );
    }

    // Priority 1: Check for per-agent private integration config
    let config = null;
    let configType = 'none';
    let agentGhlConfigId = null;

    const { data: agentConfig } = await adminSupabase
      .from('agent_ghl_configs')
      .select(`
        id,
        client_id,
        client_secret,
        redirect_uri,
        scopes,
        shared_config_id,
        config_name
      `)
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .maybeSingle();

    if (agentConfig) {
      agentGhlConfigId = agentConfig.id;

      if (agentConfig.client_id && agentConfig.client_secret) {
        // Agent has its own private integration credentials
        const encryptionService = new EncryptionService();
        config = {
          client_id: agentConfig.client_id,
          client_secret: encryptionService.decrypt(agentConfig.client_secret),
          redirect_uri: agentConfig.redirect_uri,
          scopes: agentConfig.scopes,
        };
        configType = 'private';
      } else if (agentConfig.shared_config_id) {
        // Agent uses a shared config
        const { data: sharedConfig } = await adminSupabase
          .from('oauth_app_configs')
          .select('*')
          .eq('id', agentConfig.shared_config_id)
          .eq('is_active', true)
          .maybeSingle();

        if (sharedConfig) {
          const encryptionService = new EncryptionService();
          config = {
            client_id: sharedConfig.client_id,
            client_secret: encryptionService.decrypt(sharedConfig.client_secret),
            redirect_uri: sharedConfig.redirect_uri,
            scopes: sharedConfig.scopes,
          };
          configType = 'shared';
        }
      }
    }

    // Priority 2: Fall back to user's oauth_app_configs
    if (!config) {
      const { data: userConfig } = await adminSupabase
        .from('oauth_app_configs')
        .select('*')
        .eq('provider', 'ghl')
        .eq('created_by', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (userConfig) {
        const encryptionService = new EncryptionService();
        config = {
          client_id: userConfig.client_id,
          client_secret: encryptionService.decrypt(userConfig.client_secret),
          redirect_uri: userConfig.redirect_uri,
          scopes: userConfig.scopes,
        };
        configType = 'user_default';
      }
    }

    // Priority 3: Fall back to platform-wide config
    if (!config) {
      const { data: platformConfig } = await adminSupabase
        .from('oauth_app_configs')
        .select('*')
        .eq('provider', 'ghl')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (platformConfig) {
        const encryptionService = new EncryptionService();
        config = {
          client_id: platformConfig.client_id,
          client_secret: encryptionService.decrypt(platformConfig.client_secret),
          redirect_uri: platformConfig.redirect_uri,
          scopes: platformConfig.scopes,
        };
        configType = 'platform';
      }
    }

    // Check if GHL OAuth is configured
    if (!config || !config.client_id) {
      return NextResponse.json(
        { error: 'GHL OAuth not configured. Please configure a private integration for this agent or ask your platform administrator to set up GHL app credentials.' },
        { status: 400 }
      );
    }

    // Generate state parameter for CSRF protection - include agentId and config info
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      agentId: agentId,
      agentGhlConfigId: agentGhlConfigId,
      configType: configType,
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
      configType,
    });

  } catch (error) {
    console.error('OAuth authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
