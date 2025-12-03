-- Migration: 011_per_agent_private_integration.sql
-- Description: Support per-agent private GHL integrations with shared API key support
-- Created: 2025-12-02

-- 1. Create agent_ghl_configs table for per-agent GHL credentials
-- This allows each agent to have its own private integration OR share a config
CREATE TABLE IF NOT EXISTS agent_ghl_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

    -- Option 1: Agent has its own private integration credentials
    client_id TEXT,
    client_secret TEXT,  -- Encrypted
    redirect_uri TEXT,
    scopes TEXT,

    -- Option 2: Agent uses a shared config (reference to oauth_app_configs)
    shared_config_id UUID REFERENCES oauth_app_configs(id) ON DELETE SET NULL,

    -- Metadata
    config_name TEXT,  -- Friendly name for this config
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Either has own credentials OR uses shared config
    CONSTRAINT valid_config CHECK (
        (client_id IS NOT NULL AND client_secret IS NOT NULL)
        OR shared_config_id IS NOT NULL
    )
);

-- Index for fast agent lookups
CREATE INDEX IF NOT EXISTS idx_agent_ghl_configs_agent_id ON agent_ghl_configs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_ghl_configs_shared_config ON agent_ghl_configs(shared_config_id);

-- 2. Modify ghl_sessions to support multiple agents sharing the same API key
-- Remove the unique constraint on agent_id (allow multiple agents to connect to same location)
ALTER TABLE ghl_sessions DROP CONSTRAINT IF EXISTS ghl_sessions_agent_unique;

-- Add unique constraint on agent_id + location_id combination
-- This allows: Agent A -> Location 1, Agent B -> Location 1 (same key, different agents)
ALTER TABLE ghl_sessions DROP CONSTRAINT IF EXISTS ghl_sessions_agent_location_unique;
ALTER TABLE ghl_sessions ADD CONSTRAINT ghl_sessions_agent_location_unique
    UNIQUE (agent_id, location_id);

-- 3. Add agent_ghl_config_id to ghl_sessions to track which config was used
ALTER TABLE ghl_sessions ADD COLUMN IF NOT EXISTS agent_ghl_config_id UUID
    REFERENCES agent_ghl_configs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ghl_sessions_agent_ghl_config ON ghl_sessions(agent_ghl_config_id);

-- 4. Enable RLS on agent_ghl_configs
ALTER TABLE agent_ghl_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read configs for their own agents
DROP POLICY IF EXISTS "Users can read own agent ghl configs" ON agent_ghl_configs;
CREATE POLICY "Users can read own agent ghl configs"
    ON agent_ghl_configs FOR SELECT
    USING (
        agent_id IN (
            SELECT id FROM agents WHERE account_id = auth.uid()
        )
    );

-- Policy: Users can create configs for their own agents
DROP POLICY IF EXISTS "Users can create own agent ghl configs" ON agent_ghl_configs;
CREATE POLICY "Users can create own agent ghl configs"
    ON agent_ghl_configs FOR INSERT
    WITH CHECK (
        agent_id IN (
            SELECT id FROM agents WHERE account_id = auth.uid()
        )
    );

-- Policy: Users can update configs for their own agents
DROP POLICY IF EXISTS "Users can update own agent ghl configs" ON agent_ghl_configs;
CREATE POLICY "Users can update own agent ghl configs"
    ON agent_ghl_configs FOR UPDATE
    USING (
        agent_id IN (
            SELECT id FROM agents WHERE account_id = auth.uid()
        )
    );

-- Policy: Users can delete configs for their own agents
DROP POLICY IF EXISTS "Users can delete own agent ghl configs" ON agent_ghl_configs;
CREATE POLICY "Users can delete own agent ghl configs"
    ON agent_ghl_configs FOR DELETE
    USING (
        agent_id IN (
            SELECT id FROM agents WHERE account_id = auth.uid()
        )
    );

-- 5. Function to update updated_at
CREATE OR REPLACE FUNCTION update_agent_ghl_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_agent_ghl_configs_updated_at ON agent_ghl_configs;
CREATE TRIGGER trigger_agent_ghl_configs_updated_at
    BEFORE UPDATE ON agent_ghl_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_ghl_configs_updated_at();

-- 6. Helper view to get effective config for each agent
CREATE OR REPLACE VIEW agent_effective_ghl_config AS
SELECT
    agc.id,
    agc.agent_id,
    agc.config_name,
    agc.is_active,
    -- Use agent's own credentials if present, otherwise use shared config
    COALESCE(agc.client_id, oac.client_id) as effective_client_id,
    COALESCE(agc.client_secret, oac.client_secret) as effective_client_secret,
    COALESCE(agc.redirect_uri, oac.redirect_uri) as effective_redirect_uri,
    COALESCE(agc.scopes, oac.scopes) as effective_scopes,
    agc.shared_config_id,
    CASE WHEN agc.client_id IS NOT NULL THEN 'private' ELSE 'shared' END as config_type,
    agc.created_at,
    agc.updated_at
FROM agent_ghl_configs agc
LEFT JOIN oauth_app_configs oac ON agc.shared_config_id = oac.id
WHERE agc.is_active = true;

-- Comments
COMMENT ON TABLE agent_ghl_configs IS 'Per-agent GHL private integration credentials or shared config reference';
COMMENT ON COLUMN agent_ghl_configs.client_id IS 'GHL OAuth client ID (for private integration)';
COMMENT ON COLUMN agent_ghl_configs.client_secret IS 'Encrypted GHL OAuth client secret';
COMMENT ON COLUMN agent_ghl_configs.shared_config_id IS 'Reference to shared oauth_app_configs (alternative to own credentials)';
COMMENT ON VIEW agent_effective_ghl_config IS 'Resolves effective GHL config for each agent (private or shared)';
