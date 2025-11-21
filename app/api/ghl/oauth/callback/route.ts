import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/ghl/client';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GHL OAuth callback handler
 * Uses the official GHL SDK to exchange code for tokens
 * Tokens are automatically stored via the Supabase session storage adapter
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

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

    // Verify state parameter if provided
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());

        // Check state timestamp (prevent replay attacks)
        const stateAge = Date.now() - stateData.timestamp;
        if (stateAge > 10 * 60 * 1000) { // 10 minutes
          return NextResponse.redirect(
            `${appUrl}/dashboard/settings?ghl_error=expired_state`
          );
        }
      } catch {
        // State parsing failed - continue anyway for flexibility
        console.warn('Could not parse state parameter');
      }
    }

    // Exchange code for tokens using the SDK
    // The SDK automatically stores tokens via our Supabase session storage adapter
    const tokenData = await exchangeCodeForTokens(code);

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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const errorMessage = error instanceof Error ? error.message : 'callback_failed';
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?ghl_error=${encodeURIComponent(errorMessage)}`
    );
  }
}
