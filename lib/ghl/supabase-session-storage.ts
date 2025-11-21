/**
 * Supabase Session Storage Adapter for GHL SDK
 * Implements the SessionStorage interface required by @gohighlevel/api-client
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface TokenData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  userType: string;
  locationId?: string;
  companyId?: string;
}

export interface StoredSession {
  locationId: string;
  companyId?: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: Date;
  scope: string;
  userType: string;
}

export class SupabaseSessionStorage {
  private supabase: SupabaseClient;
  private tableName = 'ghl_sessions';

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get session by location ID
   */
  async get(locationId: string): Promise<StoredSession | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('location_id', locationId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      locationId: data.location_id,
      companyId: data.company_id,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresAt: new Date(data.expires_at),
      scope: data.scope,
      userType: data.user_type,
    };
  }

  /**
   * Store or update session
   */
  async set(locationId: string, tokenData: TokenData): Promise<void> {
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    const sessionData = {
      location_id: locationId,
      company_id: tokenData.companyId || null,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_at: expiresAt.toISOString(),
      scope: tokenData.scope,
      user_type: tokenData.userType,
    };

    const { error } = await this.supabase
      .from(this.tableName)
      .upsert(sessionData, { onConflict: 'location_id' });

    if (error) {
      console.error('Error storing GHL session:', error);
      throw new Error(`Failed to store session: ${error.message}`);
    }
  }

  /**
   * Delete session by location ID
   */
  async delete(locationId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('location_id', locationId);

    if (error) {
      console.error('Error deleting GHL session:', error);
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  /**
   * Get all sessions (for admin purposes)
   */
  async getAll(): Promise<StoredSession[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      locationId: row.location_id,
      companyId: row.company_id,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      tokenType: row.token_type,
      expiresAt: new Date(row.expires_at),
      scope: row.scope,
      userType: row.user_type,
    }));
  }

  /**
   * Check if token is expired or about to expire
   */
  async isExpired(locationId: string, bufferSeconds = 300): Promise<boolean> {
    const session = await this.get(locationId);
    if (!session) return true;

    const expiresAt = session.expiresAt.getTime();
    const now = Date.now();
    const buffer = bufferSeconds * 1000;

    return now >= expiresAt - buffer;
  }

  /**
   * Get valid access token (for manual token retrieval)
   */
  async getAccessToken(locationId: string): Promise<string | null> {
    const session = await this.get(locationId);
    if (!session) return null;

    // Check if expired
    if (await this.isExpired(locationId)) {
      console.warn(`Token for location ${locationId} is expired or about to expire`);
      return null;
    }

    return session.accessToken;
  }
}

// Export singleton instance
export const ghlSessionStorage = new SupabaseSessionStorage();
