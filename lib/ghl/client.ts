/**
 * GHL Client with Supabase Token Storage
 * Simplified integration that handles OAuth and tokens directly
 */

import { ghlSessionStorage } from './supabase-session-storage';

// GHL OAuth Configuration
export const GHL_CONFIG = {
  clientId: process.env.GHL_CLIENT_ID || '',
  clientSecret: process.env.GHL_CLIENT_SECRET || '',
  redirectUri: process.env.GHL_REDIRECT_URI || '',
  scopes: process.env.GHL_SCOPES || 'conversations.readonly conversations.write conversations/message.readonly conversations/message.write contacts.readonly contacts.write locations.readonly users.readonly',
};

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_OAUTH_BASE = 'https://marketplace.gohighlevel.com';

/**
 * Get OAuth authorization URL
 */
export function getOAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: GHL_CONFIG.clientId,
    redirect_uri: GHL_CONFIG.redirectUri,
    response_type: 'code',
    scope: GHL_CONFIG.scopes,
  });

  if (state) {
    params.append('state', state);
  }

  return `${GHL_OAUTH_BASE}/oauth/chooselocation?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const response = await fetch(`${GHL_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GHL_CONFIG.clientId,
      client_secret: GHL_CONFIG.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: GHL_CONFIG.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const tokenData = await response.json();

  // Store the session
  if (tokenData.locationId) {
    await ghlSessionStorage.set(tokenData.locationId, tokenData);
  }

  return tokenData;
}

/**
 * Refresh tokens for a location
 */
export async function refreshTokens(locationId: string) {
  const session = await ghlSessionStorage.get(locationId);
  if (!session) {
    throw new Error(`No session found for location ${locationId}`);
  }

  const response = await fetch(`${GHL_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GHL_CONFIG.clientId,
      client_secret: GHL_CONFIG.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const tokenData = await response.json();

  // Update the session
  await ghlSessionStorage.set(locationId, {
    ...tokenData,
    locationId,
  });

  return tokenData;
}

/**
 * Get access token for a location (with auto-refresh if needed)
 */
export async function getAccessToken(locationId: string): Promise<string> {
  // Check if token is expired
  if (await ghlSessionStorage.isExpired(locationId)) {
    await refreshTokens(locationId);
  }

  const token = await ghlSessionStorage.getAccessToken(locationId);
  if (!token) {
    throw new Error(`No valid token for location ${locationId}`);
  }

  return token;
}

/**
 * Make an authenticated API call to GHL
 */
export async function ghlApiCall<T = any>(
  locationId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getAccessToken(locationId);

  const response = await fetch(`${GHL_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      Version: '2021-07-28',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GHL API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Send a message via GHL
 */
export async function sendMessage(
  locationId: string,
  conversationId: string,
  message: string,
  messageType: 'SMS' | 'Email' | 'WhatsApp' | 'GMB' | 'FB' | 'Instagram' = 'SMS'
) {
  return ghlApiCall(locationId, `/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      type: messageType,
      message,
    }),
  });
}

/**
 * Get conversation history
 */
export async function getConversationMessages(
  locationId: string,
  conversationId: string,
  limit = 20
) {
  return ghlApiCall(locationId, `/conversations/${conversationId}/messages?limit=${limit}`);
}

/**
 * Get contact details
 */
export async function getContact(locationId: string, contactId: string) {
  return ghlApiCall(locationId, `/contacts/${contactId}`);
}

/**
 * Search contacts
 */
export async function searchContacts(locationId: string, query: string) {
  return ghlApiCall(locationId, `/contacts/search?query=${encodeURIComponent(query)}`);
}
