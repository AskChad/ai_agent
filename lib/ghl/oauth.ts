/**
 * GoHighLevel OAuth Helper Functions
 * Handles OAuth 2.0 authorization code flow for GHL Marketplace apps
 *
 * Attack Kit Compliance:
 * - Tokens encrypted via Token Manager (never stored in plaintext)
 * - State parameter for CSRF protection
 * - Automatic token refresh with 5-minute buffer
 * - Secure token revocation
 */

import { createClient } from '@/lib/supabase/server';
import { encryptToken, decryptToken, deleteToken, validateTokenManagerConfig } from '@/lib/token-manager';
import { logger } from '@/lib/logger';

const GHL_AUTH_BASE_URL = 'https://marketplace.gohighlevel.com/oauth/chooselocation';
const GHL_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';
const GHL_LOCATION_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/locationToken';

// Required OAuth scopes for messaging
const REQUIRED_SCOPES = [
  'conversations.readonly',
  'conversations.write',
  'conversations/message.readonly',
  'conversations/message.write',
  'contacts.readonly',
  'contacts.write',
];

export interface GHLTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  userType: 'Company' | 'Location';
  locationId?: string;
  companyId?: string;
}

export interface GHLLocationTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  locationId: string;
}

/**
 * Generate OAuth authorization URL to redirect user to GHL
 */
export function getAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state?: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: REQUIRED_SCOPES.join(' '),
  });

  if (state) {
    params.append('state', state);
  }

  return `${GHL_AUTH_BASE_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<GHLTokenResponse> {
  const response = await fetch(GHL_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<GHLTokenResponse> {
  const response = await fetch(GHL_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

/**
 * Generate a location-specific token from a company-level token
 */
export async function getLocationToken(
  companyToken: string,
  locationId: string,
  clientId: string,
  clientSecret: string
): Promise<GHLLocationTokenResponse> {
  const response = await fetch(GHL_LOCATION_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      companyId: locationId,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get location token: ${error}`);
  }

  return response.json();
}

/**
 * Store OAuth tokens in database
 *
 * ✅ CORRECT: Encrypts tokens using Token Manager before storing
 * ❌ WRONG: Never store plaintext tokens in database
 */
export async function storeTokens(
  accountId: string,
  locationId: string,
  tokens: GHLTokenResponse
): Promise<void> {
  // Validate Token Manager is configured
  validateTokenManagerConfig();

  const supabase = await createClient();

  logger.info('Storing GHL OAuth tokens', { accountId, locationId });

  try {
    // ✅ ENCRYPT tokens using Token Manager
    const accessTokenRef = await encryptToken('ghl', accountId, tokens.access_token);
    const refreshTokenRef = await encryptToken('ghl', accountId, tokens.refresh_token);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store ENCRYPTED REFERENCES (not plaintext!)
    const { error } = await (supabase as any)
      .from('ghl_oauth_tokens')
      .upsert({
        account_id: accountId,
        access_token_reference: accessTokenRef,  // ✅ Encrypted reference
        refresh_token_reference: refreshTokenRef,  // ✅ Encrypted reference
        token_type: tokens.token_type,
        scope: tokens.scope,
        expires_at: expiresAt.toISOString(),
        location_id: locationId,
        company_id: tokens.companyId || null,
      }, {
        onConflict: 'account_id',  // Changed from account_id,ghl_location_id
      });

    if (error) {
      logger.error('Failed to store tokens in database', error);
      throw new Error(`Failed to store tokens: ${error.message}`);
    }

    // Update account with GHL location ID
    await (supabase as any)
      .from('accounts')
      .update({ ghl_location_id: locationId })
      .eq('id', accountId);

    logger.info('GHL OAuth tokens stored successfully', {
      accountId,
      locationId,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    logger.error('Failed to store GHL tokens', {
      accountId,
      locationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get valid access token for account, refreshing if necessary
 *
 * ✅ CORRECT: Decrypts token references from Token Manager
 */
export async function getValidToken(
  accountId: string,
  locationId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const supabase = await createClient();

  logger.debug('Getting valid GHL token', { accountId, locationId });

  const { data: tokenData, error } = await (supabase as any)
    .from('ghl_oauth_tokens')
    .select('*')
    .eq('account_id', accountId)
    .single();

  if (error || !tokenData) {
    logger.error('No OAuth tokens found', { accountId, locationId, error });
    throw new Error('No OAuth tokens found. Please reconnect to GoHighLevel.');
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    // Token is still valid, decrypt and return
    logger.debug('Token still valid, decrypting', {
      accountId,
      expiresAt: expiresAt.toISOString(),
    });

    // ✅ DECRYPT token reference to get plaintext value
    const accessToken = await decryptToken(tokenData.access_token_reference);
    return accessToken;
  }

  // Token is expired or about to expire, refresh it
  logger.info('Token expired or expiring soon, refreshing', {
    accountId,
    expiresAt: expiresAt.toISOString(),
  });

  try {
    // ✅ DECRYPT refresh token to use for refresh request
    const refreshToken = await decryptToken(tokenData.refresh_token_reference);

    const newTokens = await refreshAccessToken(
      refreshToken,
      clientId,
      clientSecret
    );

    // Store new encrypted tokens
    await storeTokens(accountId, locationId, newTokens);

    logger.info('Token refreshed successfully', { accountId });

    return newTokens.access_token;
  } catch (error) {
    logger.error('Failed to refresh token', {
      accountId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to refresh token. Please reconnect to GoHighLevel.');
  }
}

/**
 * Revoke OAuth tokens (disconnect)
 *
 * ✅ CORRECT: Deletes encrypted tokens from Token Manager AND database
 */
export async function revokeTokens(
  accountId: string,
  locationId: string
): Promise<void> {
  const supabase = await createClient();

  logger.info('Revoking GHL OAuth tokens', { accountId, locationId });

  try {
    // Get token references before deleting
    const { data: tokenData } = await (supabase as any)
      .from('ghl_oauth_tokens')
      .select('access_token_reference, refresh_token_reference')
      .eq('account_id', accountId)
      .single();

    // Delete token references from Token Manager
    if (tokenData) {
      await deleteToken(tokenData.access_token_reference);
      await deleteToken(tokenData.refresh_token_reference);
      logger.debug('Deleted encrypted tokens from Token Manager');
    }

    // Delete from database
    const { error } = await (supabase as any)
      .from('ghl_oauth_tokens')
      .delete()
      .eq('account_id', accountId);

    if (error) {
      logger.error('Failed to delete tokens from database', error);
      throw new Error(`Failed to revoke tokens: ${error.message}`);
    }

    logger.info('GHL OAuth tokens revoked successfully', { accountId });
  } catch (error) {
    logger.error('Failed to revoke tokens', {
      accountId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
