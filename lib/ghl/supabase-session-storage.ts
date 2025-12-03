/**
 * Supabase Session Storage Adapter for GHL SDK
 * Implements the SessionStorage interface required by @gohighlevel/api-client
 *
 * Supports:
 * - Per-agent private integrations
 * - Multiple agents sharing the same API key (same location)
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
  id?: string;
  agentId?: string;
  locationId: string;
  companyId?: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: Date;
  scope: string;
  userType: string;
  agentGhlConfigId?: string;
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
   * Get session by location ID (legacy - returns first match)
   */
  async get(locationId: string): Promise<StoredSession | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('location_id', locationId)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapRowToSession(data);
  }

  /**
   * Get session by agent ID - preferred method for per-agent lookups
   */
  async getByAgentId(agentId: string): Promise<StoredSession | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('agent_id', agentId)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapRowToSession(data);
  }

  /**
   * Get session by agent ID and location ID - for shared key scenarios
   */
  async getByAgentAndLocation(agentId: string, locationId: string): Promise<StoredSession | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('agent_id', agentId)
      .eq('location_id', locationId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapRowToSession(data);
  }

  /**
   * Get all sessions for a specific location (multiple agents sharing same key)
   */
  async getAllByLocationId(locationId: string): Promise<StoredSession[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => this.mapRowToSession(row));
  }

  /**
   * Store or update session - supports per-agent storage
   */
  async set(locationId: string, tokenData: TokenData, agentId?: string, agentGhlConfigId?: string): Promise<void> {
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    const sessionData: Record<string, any> = {
      location_id: locationId,
      company_id: tokenData.companyId || null,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_at: expiresAt.toISOString(),
      scope: tokenData.scope,
      user_type: tokenData.userType,
      updated_at: new Date().toISOString(),
    };

    if (agentId) {
      sessionData.agent_id = agentId;
    }

    if (agentGhlConfigId) {
      sessionData.agent_ghl_config_id = agentGhlConfigId;
    }

    // Determine conflict resolution based on whether agent_id is provided
    const onConflict = agentId ? 'agent_id,location_id' : 'location_id';

    const { error } = await this.supabase
      .from(this.tableName)
      .upsert(sessionData, { onConflict });

    if (error) {
      console.error('Error storing GHL session:', error);
      throw new Error(`Failed to store session: ${error.message}`);
    }
  }

  /**
   * Delete session by location ID (legacy)
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
   * Delete session by agent ID
   */
  async deleteByAgentId(agentId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('agent_id', agentId);

    if (error) {
      console.error('Error deleting GHL session for agent:', error);
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  /**
   * Delete session by agent ID and location ID (for shared key scenarios)
   */
  async deleteByAgentAndLocation(agentId: string, locationId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('agent_id', agentId)
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

    return data.map((row) => this.mapRowToSession(row));
  }

  /**
   * Check if token is expired or about to expire (by location)
   */
  async isExpired(locationId: string, bufferSeconds = 300): Promise<boolean> {
    const session = await this.get(locationId);
    if (!session) return true;

    return this.isSessionExpired(session, bufferSeconds);
  }

  /**
   * Check if token is expired or about to expire (by agent)
   */
  async isExpiredByAgentId(agentId: string, bufferSeconds = 300): Promise<boolean> {
    const session = await this.getByAgentId(agentId);
    if (!session) return true;

    return this.isSessionExpired(session, bufferSeconds);
  }

  /**
   * Get valid access token (for manual token retrieval by location)
   */
  async getAccessToken(locationId: string): Promise<string | null> {
    const session = await this.get(locationId);
    if (!session) return null;

    if (this.isSessionExpired(session)) {
      console.warn(`Token for location ${locationId} is expired or about to expire`);
      return null;
    }

    return session.accessToken;
  }

  /**
   * Get valid access token by agent ID
   */
  async getAccessTokenByAgentId(agentId: string): Promise<string | null> {
    const session = await this.getByAgentId(agentId);
    if (!session) return null;

    if (this.isSessionExpired(session)) {
      console.warn(`Token for agent ${agentId} is expired or about to expire`);
      return null;
    }

    return session.accessToken;
  }

  /**
   * Helper: Check if a session is expired
   */
  private isSessionExpired(session: StoredSession, bufferSeconds = 300): boolean {
    const expiresAt = session.expiresAt.getTime();
    const now = Date.now();
    const buffer = bufferSeconds * 1000;

    return now >= expiresAt - buffer;
  }

  /**
   * Helper: Map database row to StoredSession
   */
  private mapRowToSession(row: any): StoredSession {
    return {
      id: row.id,
      agentId: row.agent_id,
      locationId: row.location_id,
      companyId: row.company_id,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      tokenType: row.token_type,
      expiresAt: new Date(row.expires_at),
      scope: row.scope,
      userType: row.user_type,
      agentGhlConfigId: row.agent_ghl_config_id,
    };
  }
}

// Export singleton instance
export const ghlSessionStorage = new SupabaseSessionStorage();
