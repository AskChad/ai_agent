-- Multi-Agent Architecture Migration
-- Allows one account to have multiple AI agents with platform admin controls

-- 1. Add max_agents to accounts table (0 = unlimited)
ALTER TABLE accounts
ADD COLUMN max_agents INTEGER DEFAULT 1,
ADD COLUMN is_platform_admin BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN accounts.max_agents IS 'Maximum number of agents this account can create. 0 = unlimited';
COMMENT ON COLUMN accounts.is_platform_admin IS 'Platform admin can manage all accounts and set limits';

-- 2. Create agents table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- AI Configuration
    ai_provider VARCHAR(50) DEFAULT 'openai', -- openai, anthropic
    ai_model VARCHAR(100) DEFAULT 'gpt-4',
    system_prompt TEXT DEFAULT 'You are a helpful AI assistant.',
    context_window INTEGER DEFAULT 60,
    enable_function_calling BOOLEAN DEFAULT TRUE,

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, paused, archived
    is_default BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_account_agent_name UNIQUE(account_id, name)
);

CREATE INDEX idx_agents_account ON agents(account_id);
CREATE INDEX idx_agents_status ON agents(status);

COMMENT ON TABLE agents IS 'AI agents - each account can have multiple agents';
COMMENT ON COLUMN agents.is_default IS 'Default agent for the account (auto-selected)';

-- 3. Add agent_id to existing tables
ALTER TABLE conversations
ADD COLUMN agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;

ALTER TABLE functions
ADD COLUMN agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;

ALTER TABLE knowledge_base
ADD COLUMN agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;

ALTER TABLE ghl_integrations
ADD COLUMN agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;

-- 4. Create indexes for new agent_id columns
CREATE INDEX idx_conversations_agent ON conversations(agent_id);
CREATE INDEX idx_functions_agent ON functions(agent_id);
CREATE INDEX idx_knowledge_base_agent ON knowledge_base(agent_id);
CREATE INDEX idx_ghl_integrations_agent ON ghl_integrations(agent_id);

-- 5. Create function to enforce agent limits
CREATE OR REPLACE FUNCTION check_agent_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    max_allowed INTEGER;
BEGIN
    -- Get the account's max_agents setting
    SELECT max_agents INTO max_allowed
    FROM accounts
    WHERE id = NEW.account_id;

    -- If max_agents is 0, unlimited agents allowed
    IF max_allowed = 0 THEN
        RETURN NEW;
    END IF;

    -- Count current agents for this account
    SELECT COUNT(*) INTO current_count
    FROM agents
    WHERE account_id = NEW.account_id
    AND status != 'archived';

    -- Check if limit exceeded
    IF current_count >= max_allowed THEN
        RAISE EXCEPTION 'Agent limit reached. Maximum allowed: %', max_allowed;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to enforce agent limits
CREATE TRIGGER enforce_agent_limit
    BEFORE INSERT ON agents
    FOR EACH ROW
    EXECUTE FUNCTION check_agent_limit();

-- 7. Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_agent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_timestamp();

-- 8. Create default agents for existing accounts
-- This ensures backward compatibility
INSERT INTO agents (account_id, name, description, is_default)
SELECT
    id,
    'Default Agent',
    'Your primary AI assistant',
    TRUE
FROM accounts
WHERE NOT EXISTS (
    SELECT 1 FROM agents WHERE agents.account_id = accounts.id
);

-- 9. Update existing data to link to default agents
UPDATE conversations c
SET agent_id = (
    SELECT a.id
    FROM agents a
    WHERE a.account_id = c.account_id
    AND a.is_default = TRUE
    LIMIT 1
)
WHERE agent_id IS NULL;

UPDATE functions f
SET agent_id = (
    SELECT a.id
    FROM agents a
    WHERE a.account_id = f.account_id
    AND a.is_default = TRUE
    LIMIT 1
)
WHERE agent_id IS NULL;

UPDATE knowledge_base kb
SET agent_id = (
    SELECT a.id
    FROM agents a
    WHERE a.account_id = kb.account_id
    AND a.is_default = TRUE
    LIMIT 1
)
WHERE agent_id IS NULL;

UPDATE ghl_integrations gi
SET agent_id = (
    SELECT a.id
    FROM agents a
    WHERE a.account_id = gi.account_id
    AND a.is_default = TRUE
    LIMIT 1
)
WHERE agent_id IS NULL;

-- 10. Make agent_id NOT NULL after migration
ALTER TABLE conversations ALTER COLUMN agent_id SET NOT NULL;
ALTER TABLE functions ALTER COLUMN agent_id SET NOT NULL;
ALTER TABLE knowledge_base ALTER COLUMN agent_id SET NOT NULL;
ALTER TABLE ghl_integrations ALTER COLUMN agent_id SET NOT NULL;

-- 11. Create view for agent statistics
CREATE OR REPLACE VIEW agent_stats AS
SELECT
    a.id as agent_id,
    a.account_id,
    a.name as agent_name,
    a.status,
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(DISTINCT f.id) as total_functions,
    COUNT(DISTINCT kb.id) as total_knowledge_items,
    MAX(c.updated_at) as last_conversation_at,
    a.created_at,
    a.updated_at
FROM agents a
LEFT JOIN conversations c ON c.agent_id = a.id
LEFT JOIN functions f ON f.agent_id = a.id
LEFT JOIN knowledge_base kb ON kb.agent_id = a.id
GROUP BY a.id, a.account_id, a.name, a.status, a.created_at, a.updated_at;

-- 12. Create view for account usage
CREATE OR REPLACE VIEW account_agent_usage AS
SELECT
    acc.id as account_id,
    acc.email,
    acc.max_agents,
    COUNT(a.id) FILTER (WHERE a.status = 'active') as active_agents,
    COUNT(a.id) as total_agents,
    CASE
        WHEN acc.max_agents = 0 THEN 'unlimited'
        WHEN COUNT(a.id) FILTER (WHERE a.status = 'active') >= acc.max_agents THEN 'at_limit'
        ELSE 'under_limit'
    END as usage_status
FROM accounts acc
LEFT JOIN agents a ON a.account_id = acc.id
GROUP BY acc.id, acc.email, acc.max_agents;

COMMENT ON VIEW agent_stats IS 'Statistics for each agent including conversation and function counts';
COMMENT ON VIEW account_agent_usage IS 'Agent usage and limits per account';
