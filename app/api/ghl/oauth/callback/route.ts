import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, storeTokens, autoExchangeLocationTokens } from '@/lib/ghl/oauth';
import { logger } from '@/lib/logger';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GHL OAuth callback handler
 * Receives authorization code and exchanges it for access token
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    // Handle OAuth error
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?ghl_error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?ghl_error=missing_parameters`
      );
    }

    // Verify state parameter
    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?ghl_error=invalid_state`
      );
    }

    // Check state timestamp (prevent replay attacks)
    const stateAge = Date.now() - stateData.timestamp;
    if (stateAge > 10 * 60 * 1000) { // 10 minutes
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?ghl_error=expired_state`
      );
    }

    // Get OAuth credentials
    const clientId = process.env.GHL_CLIENT_ID!;
    const clientSecret = process.env.GHL_CLIENT_SECRET!;
    const redirectUri = process.env.GHL_REDIRECT_URI || `${appUrl}/api/ghl/oauth/callback`;

    // Exchange code for token
    const tokens = await exchangeCodeForToken(code, clientId, clientSecret, redirectUri);

    logger.info('OAuth token received', {
      userType: tokens.userType,
      locationId: tokens.locationId,
      companyId: tokens.companyId,
      scopes: tokens.scope,
    });

    // Handle company-level vs location-level tokens
    if (tokens.userType === 'Company') {
      // Company-level token - auto-exchange for all locations
      logger.info('Company-level token detected, starting auto-exchange', {
        companyId: tokens.companyId,
      });

      try {
        const locationIds = await autoExchangeLocationTokens(
          stateData.userId,
          tokens,
          clientId,
          clientSecret
        );

        if (locationIds.length === 0) {
          return NextResponse.redirect(
            `${appUrl}/dashboard/settings?ghl_error=no_locations_found`
          );
        }

        logger.info('Company token successfully exchanged for all locations', {
          locationIds,
          count: locationIds.length,
        });

        // Success! Redirect with info about locations set up
        return NextResponse.redirect(
          `${appUrl}/dashboard/settings?ghl_connected=true&locations=${locationIds.length}`
        );
      } catch (error) {
        logger.error('Auto-exchange failed', error);
        return NextResponse.redirect(
          `${appUrl}/dashboard/settings?ghl_error=auto_exchange_failed`
        );
      }
    } else {
      // Location-level token - store directly
      const locationId = tokens.locationId;
      if (!locationId) {
        return NextResponse.redirect(
          `${appUrl}/dashboard/settings?ghl_error=no_location_id`
        );
      }

      logger.info('Location-level token, storing directly', {
        locationId,
      });

      // Store tokens in database
      await storeTokens(stateData.userId, locationId, tokens);

      // Success! Redirect to settings page
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?ghl_connected=true`
      );
    }

  } catch (error) {
    console.error('OAuth callback error:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?ghl_error=callback_failed`
    );
  }
}
