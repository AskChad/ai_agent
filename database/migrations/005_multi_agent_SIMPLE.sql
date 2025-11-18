-- ===========================================
-- Multi-Agent Architecture Migration
-- Run this in Supabase SQL Editor
-- ===========================================

-- 1. Add agent limit columns to accounts table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='max_agents') THEN
        ALTER TABLE accounts ADD COLUMN max_agents INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='is_platform_admin') THEN
        ALTER TABLE accounts ADD COLUMN is_platform_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
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
    CONSTRAINT unique_account_agent_name UNIQUE(account_id, name)
);

CREATE INDEX IF NOT EXISTS idx_agents_account ON agents(account_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- 3. Add agent_id to existing tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='agent_id') THEN
        ALTER TABLE conversations ADD COLUMN agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='functions' AND column_name='agent_id') THEN
        ALTER TABLE functions ADD COLUMN agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='knowledge_base' AND column_name='agent_id') THEN
        ALTER TABLE knowledge_base ADD COLUMN agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ghl_integrations' AND column_name='agent_id') THEN
        ALTER TABLE ghl_integrations ADD COLUMN agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_functions_agent ON functions(agent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_agent ON knowledge_base(agent_id);
CREATE INDEX IF NOT EXISTS idx_ghl_integrations_agent ON ghl_integrations(agent_id);

-- 5. Create default agents for existing accounts
INSERT INTO agents (account_id, name, description, is_default)
SELECT
    id,
    'Default Agent',
    'Your primary AI assistant',
    TRUE
FROM accounts
WHERE NOT EXISTS (
    SELECT 1 FROM agents WHERE agents.account_id = accounts.id
)
ON CONFLICT DO NOTHING;

-- 6. Link existing data to default agents
UPDATE conversations c
SET agent_id = (
    SELECT a.id
    FROM agents a
    WHERE a.account_id = c.account_id
    AND a.is_default = TRUE
    LIMIT 1
)
WHERE agent_id IS NULL
AND EXISTS (
    SELECT 1 FROM agents a
    WHERE a.account_id = c.account_id
    AND a.is_default = TRUE
);

UPDATE functions f
SET agent_id = (
    SELECT a.id
    FROM agents a
    WHERE a.account_id = f.account_id
    AND a.is_default = TRUE
    LIMIT 1
)
WHERE agent_id IS NULL
AND EXISTS (
    SELECT 1 FROM agents a
    WHERE a.account_id = f.account_id
    AND a.is_default = TRUE
);

UPDATE knowledge_base kb
SET agent_id = (
    SELECT a.id
    FROM agents a
    WHERE a.account_id = kb.account_id
    AND a.is_default = TRUE
    LIMIT 1
)
WHERE agent_id IS NULL
AND EXISTS (
    SELECT 1 FROM agents a
    WHERE a.account_id = kb.account_id
    AND a.is_default = TRUE
);

UPDATE ghl_integrations gi
SET agent_id = (
    SELECT a.id
    FROM agents a
    WHERE a.account_id = gi.account_id
    AND a.is_default = TRUE
    LIMIT 1
)
WHERE agent_id IS NULL
AND EXISTS (
    SELECT 1 FROM agents a
    WHERE a.account_id = gi.account_id
    AND a.is_default = TRUE
);

-- 7. Verification query
SELECT
    'Migration complete!' as status,
    (SELECT COUNT(*) FROM agents) as total_agents,
    (SELECT COUNT(DISTINCT account_id) FROM agents) as accounts_with_agents;
