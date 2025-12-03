import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EncryptionService } from '@/lib/services/encryption.service';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GHL OAuth callback handler
 * Exchanges code for tokens using per-agent config or shared config
 * Supports multiple agents sharing the same API key (same location)
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth error
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?ghl_error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?ghl_error=missing_code`
      );
    }

    // Parse state to get userId, agentId, and config info
    let userId: string | null = null;
    let agentId: string | null = null;
    let agentGhlConfigId: string | null = null;
    let configType: string = 'none';

    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = stateData.userId;
        agentId = stateData.agentId;
        agentGhlConfigId = stateData.agentGhlConfigId;
        configType = stateData.configType || 'none';

        // Check state timestamp (prevent replay attacks)
        const stateAge = Date.now() - stateData.timestamp;
        if (stateAge > 10 * 60 * 1000) { // 10 minutes
          return NextResponse.redirect(
            `${appUrl}/dashboard/agents?ghl_error=expired_state`
          );
        }
      } catch {
        console.warn('Could not parse state parameter');
      }
    }

    if (!userId) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/agents?ghl_error=invalid_state`
      );
    }

    if (!agentId) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/agents?ghl_error=missing_agent_id`
      );
    }

    // Create admin Supabase client to fetch config
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Load OAuth config based on config type from state
    let config = null;
    const encryptionService = new EncryptionService();

    // Priority 1: Per-agent private integration config
    if (agentGhlConfigId) {
      const { data: agentConfig } = await supabase
        .from('agent_ghl_configs')
        .select(`
          id,
          client_id,
          client_secret,
          redirect_uri,
          scopes,
          shared_config_id
        `)
        .eq('id', agentGhlConfigId)
        .eq('is_active', true)
        .maybeSingle();

      if (agentConfig) {
        if (agentConfig.client_id && agentConfig.client_secret) {
          // Agent has its own private integration
          config = {
            client_id: agentConfig.client_id,
            client_secret: encryptionService.decrypt(agentConfig.client_secret),
            redirect_uri: agentConfig.redirect_uri,
          };
        } else if (agentConfig.shared_config_id) {
          // Agent uses a shared config
          const { data: sharedConfig } = await supabase
            .from('oauth_app_configs')
            .select('*')
            .eq('id', agentConfig.shared_config_id)
            .eq('is_active', true)
            .maybeSingle();

          if (sharedConfig) {
            config = {
              client_id: sharedConfig.client_id,
              client_secret: encryptionService.decrypt(sharedConfig.client_secret),
              redirect_uri: sharedConfig.redirect_uri,
            };
          }
        }
      }
    }

    // Priority 2: Fall back to user's oauth_app_configs
    if (!config) {
      const { data: userConfig } = await supabase
        .from('oauth_app_configs')
        .select('*')
        .eq('provider', 'ghl')
        .eq('created_by', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (userConfig) {
        config = {
          client_id: userConfig.client_id,
          client_secret: encryptionService.decrypt(userConfig.client_secret),
          redirect_uri: userConfig.redirect_uri,
        };
      }
    }

    // Priority 3: Fall back to platform-wide config
    if (!config) {
      const { data: platformConfig } = await supabase
        .from('oauth_app_configs')
        .select('*')
        .eq('provider', 'ghl')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (platformConfig) {
        config = {
          client_id: platformConfig.client_id,
          client_secret: encryptionService.decrypt(platformConfig.client_secret),
          redirect_uri: platformConfig.redirect_uri,
        };
      }
    }

    if (!config) {
      console.error('No OAuth config found for GHL');
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?ghl_error=config_not_found`
      );
    }

    // Exchange code for tokens
    const response = await fetch(`${GHL_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.client_id,
        client_secret: config.client_secret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirect_uri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?ghl_error=${encodeURIComponent('Token exchange failed: ' + errorText)}`
      );
    }

    const tokenData = await response.json();

    console.log('OAuth successful:', {
      userType: tokenData.userType,
      locationId: tokenData.locationId,
      companyId: tokenData.companyId,
      configType: configType,
    });

    // Store the session in database with agent association
    // NOTE: Multiple agents can now share the same location_id (same API key)
    const locationId = tokenData.locationId || tokenData.companyId || agentId;
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Use agent_id + location_id as the unique constraint (allows shared keys)
    const { error: sessionError } = await supabase
      .from('ghl_sessions')
      .upsert({
        agent_id: agentId,
        location_id: locationId,
        company_id: tokenData.companyId || null,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type || 'Bearer',
        expires_at: expiresAt.toISOString(),
        scope: tokenData.scope,
        user_type: tokenData.userType,
        user_id: userId,
        agent_ghl_config_id: agentGhlConfigId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agent_id,location_id' });

    if (sessionError) {
      console.error('Error storing GHL session:', sessionError);
      return NextResponse.redirect(
        `${appUrl}/dashboard/agents?ghl_error=${encodeURIComponent('Failed to store session: ' + sessionError.message)}`
      );
    }

    // Handle company-level vs location-level tokens - redirect to agents page
    if (tokenData.userType === 'Company') {
      // Company token - redirect with company info
      return NextResponse.redirect(
        `${appUrl}/dashboard/agents?ghl_connected=true&agentId=${agentId}&type=company&companyId=${tokenData.companyId}`
      );
    } else {
      // Location token - redirect with location info
      return NextResponse.redirect(
        `${appUrl}/dashboard/agents?ghl_connected=true&agentId=${agentId}&locationId=${locationId}`
      );
    }

  } catch (error) {
    console.error('OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'callback_failed';
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?ghl_error=${encodeURIComponent(errorMessage)}`
    );
  }
}
