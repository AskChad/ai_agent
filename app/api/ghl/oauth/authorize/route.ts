import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getOAuthUrl, GHL_CONFIG } from '@/lib/ghl/client';

/**
 * Initiate GHL OAuth flow
 * Uses the official GHL SDK for OAuth authorization
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

    // Check if GHL OAuth is configured
    if (!GHL_CONFIG.clientId) {
      return NextResponse.json(
        { error: 'GHL OAuth not configured. Please set GHL_CLIENT_ID environment variable.' },
        { status: 500 }
      );
    }

    // Generate state parameter for CSRF protection
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
    })).toString('base64');

    // Generate authorization URL using SDK
    const authUrl = getOAuthUrl(state);

    // Return redirect URL for frontend to handle
    return NextResponse.json({
      success: true,
      authUrl,
      scopes: GHL_CONFIG.scopes,
    });

  } catch (error) {
    console.error('OAuth authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
