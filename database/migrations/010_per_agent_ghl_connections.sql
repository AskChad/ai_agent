-- Migration: 010_per_agent_ghl_connections.sql
-- Description: Add per-agent GHL connections (instead of platform-wide)
-- Created: 2025-11-22

-- Enable uuid extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create agents table (if not exists)
-- Each agent belongs to a user and can have its own GHL connection
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    ai_provider VARCHAR(50) DEFAULT 'openai',
    ai_model VARCHAR(100) DEFAULT 'gpt-4',
    system_prompt TEXT DEFAULT 'You are a helpful AI assistant.',
    context_window INTEGER DEFAULT 60,
    enable_function_calling BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'active',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_agent_name UNIQUE(user_id, name)
);

-- Create indexes for agents table
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- 2. Add agent_id column to ghl_sessions
-- This allows each agent to have its own GHL connection
ALTER TABLE ghl_sessions ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;

-- Create index on agent_id
CREATE INDEX IF NOT EXISTS idx_ghl_sessions_agent_id ON ghl_sessions(agent_id);

-- Drop old location_id unique constraint (if exists)
ALTER TABLE ghl_sessions DROP CONSTRAINT IF EXISTS ghl_sessions_location_id_key;

-- Add new unique constraint on agent_id (one GHL connection per agent)
ALTER TABLE ghl_sessions ADD CONSTRAINT IF NOT EXISTS ghl_sessions_agent_unique UNIQUE (agent_id);

-- 3. Enable RLS on agents table
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own agents
DROP POLICY IF EXISTS "Users can read own agents" ON agents;
CREATE POLICY "Users can read own agents"
    ON agents FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can create their own agents
DROP POLICY IF EXISTS "Users can create own agents" ON agents;
CREATE POLICY "Users can create own agents"
    ON agents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own agents
DROP POLICY IF EXISTS "Users can update own agents" ON agents;
CREATE POLICY "Users can update own agents"
    ON agents FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own agents
DROP POLICY IF EXISTS "Users can delete own agents" ON agents;
CREATE POLICY "Users can delete own agents"
    ON agents FOR DELETE
    USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE agents IS 'AI agents that can be connected to GHL locations';
COMMENT ON COLUMN agents.user_id IS 'Owner of the agent';
COMMENT ON COLUMN ghl_sessions.agent_id IS 'Agent this GHL connection belongs to';
