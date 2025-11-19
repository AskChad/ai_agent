import { NextResponse } from 'next/server';
import { AVAILABLE_SCOPES } from '@/lib/ghl/oauth';

/**
 * Get available OAuth scopes for GHL integration
 * GET /api/ghl/scopes
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    scopes: AVAILABLE_SCOPES,
    defaultScopes: [
      'conversations.readonly',
      'conversations.write',
      'conversations/message.readonly',
      'conversations/message.write',
      'contacts.readonly',
      'contacts.write',
      'locations.readonly',
    ],
  });
}
