/**
 * GHL OAuth Callback Handler
 * Handles the OAuth redirect from GoHighLevel
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/ghl/client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  // Validate authorization code
  if (!code) {
    console.error('No authorization code received');
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=No%20authorization%20code%20received', request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokenData = await exchangeCodeForTokens(code);

    console.log('OAuth successful for location:', tokenData.locationId);

    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?success=true&locationId=${tokenData.locationId}`,
        request.url
      )
    );
  } catch (err) {
    console.error('Token exchange error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Token exchange failed';
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
