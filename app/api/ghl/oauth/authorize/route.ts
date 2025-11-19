import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/ghl/oauth';

/**
 * Initiate GHL OAuth flow
 * Redirects user to GoHighLevel authorization page
 *
 * Accepts optional POST body with scopes array:
 * POST /api/ghl/oauth/authorize
 * { "scopes": ["conversations.readonly", "contacts.write", ...] }
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

    // Get GHL OAuth credentials from environment
    const clientId = process.env.GHL_CLIENT_ID;
    const redirectUri = process.env.GHL_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/oauth/callback`;

    if (!clientId) {
      return NextResponse.json(
        { error: 'GHL OAuth not configured. Please set GHL_CLIENT_ID environment variable.' },
        { status: 500 }
      );
    }

    // Get optional scopes from request body (POST) or query params (GET)
    let selectedScopes: string[] | undefined;

    if (request.method === 'POST') {
      try {
        const body = await request.json();
        selectedScopes = body.scopes;
      } catch {
        // Ignore JSON parse errors
      }
    } else {
      const scopesParam = request.nextUrl.searchParams.get('scopes');
      if (scopesParam) {
        selectedScopes = scopesParam.split(',');
      }
    }

    // Generate state parameter for CSRF protection
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
    })).toString('base64');

    // Generate authorization URL with custom scopes
    const authUrl = getAuthorizationUrl(clientId, redirectUri, state, selectedScopes);

    // Return redirect URL for frontend to handle
    return NextResponse.json({
      success: true,
      authUrl,
      scopes: selectedScopes || 'default',
    });

  } catch (error) {
    console.error('OAuth authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
