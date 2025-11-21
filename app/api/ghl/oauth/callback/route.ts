import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ghlSessionStorage } from '@/lib/ghl/supabase-session-storage';
import { EncryptionService } from '@/lib/services/encryption.service';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GHL OAuth callback handler
 * Exchanges code for tokens using config from database
 * Tokens are stored via the Supabase session storage adapter
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

    // Parse state to get userId
    let userId: string | null = null;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = stateData.userId;

        // Check state timestamp (prevent replay attacks)
        const stateAge = Date.now() - stateData.timestamp;
        if (stateAge > 10 * 60 * 1000) { // 10 minutes
          return NextResponse.redirect(
            `${appUrl}/dashboard/settings?ghl_error=expired_state`
          );
        }
      } catch {
        console.warn('Could not parse state parameter');
      }
    }

    if (!userId) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?ghl_error=invalid_state`
      );
    }

    // Create admin Supabase client to fetch config
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Load OAuth config from database
    const { data: config, error: configError } = await supabase
      .from('oauth_app_configs')
      .select('*')
      .eq('provider', 'ghl')
      .eq('created_by', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (configError || !config) {
      console.error('Error fetching OAuth config:', configError);
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?ghl_error=config_not_found`
      );
    }

    // Decrypt client secret
    const encryptionService = new EncryptionService();
    const clientSecret = encryptionService.decrypt(config.client_secret);

    // Exchange code for tokens
    const response = await fetch(`${GHL_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.client_id,
        client_secret: clientSecret,
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

    // Store the session
    if (tokenData.locationId) {
      await ghlSessionStorage.set(tokenData.locationId, tokenData);
    }

    console.log('OAuth successful:', {
      userType: tokenData.userType,
      locationId: tokenData.locationId,
      companyId: tokenData.companyId,
    });

    // Handle company-level vs location-level tokens
    if (tokenData.userType === 'Company') {
      // Company token - redirect with company info
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?ghl_connected=true&type=company&companyId=${tokenData.companyId}`
      );
    } else {
      // Location token - redirect with location info
      if (!tokenData.locationId) {
        return NextResponse.redirect(
          `${appUrl}/dashboard/settings?ghl_error=no_location_id`
        );
      }

      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?ghl_connected=true&locationId=${tokenData.locationId}`
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
