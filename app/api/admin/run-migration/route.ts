import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const migrationSQL = `
-- Multi-Agent Architecture Migration
-- Allows one account to have multiple AI agents with platform admin controls

-- 1. Add max_agents to accounts table (0 = unlimited)
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

-- 5. Create function to enforce agent limits
CREATE OR REPLACE FUNCTION check_agent_limit()
RETURNS TRIGGER AS $BODY$
DECLARE
    current_count INTEGER;
    max_allowed INTEGER;
BEGIN
    SELECT max_agents INTO max_allowed FROM accounts WHERE id = NEW.account_id;
    IF max_allowed = 0 THEN RETURN NEW; END IF;
    SELECT COUNT(*) INTO current_count FROM agents WHERE account_id = NEW.account_id AND status != 'archived';
    IF current_count >= max_allowed THEN
        RAISE EXCEPTION 'Agent limit reached. Maximum allowed: %', max_allowed;
    END IF;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

-- 6. Create trigger
DROP TRIGGER IF EXISTS enforce_agent_limit ON agents;
CREATE TRIGGER enforce_agent_limit BEFORE INSERT ON agents FOR EACH ROW EXECUTE FUNCTION check_agent_limit();

-- 7. Create default agents for existing accounts
INSERT INTO agents (account_id, name, description, is_default)
SELECT id, 'Default Agent', 'Your primary AI assistant', TRUE
FROM accounts
WHERE NOT EXISTS (SELECT 1 FROM agents WHERE agents.account_id = accounts.id)
ON CONFLICT DO NOTHING;

-- 8. Update existing data to link to default agents
UPDATE conversations c SET agent_id = (
    SELECT a.id FROM agents a WHERE a.account_id = c.account_id AND a.is_default = TRUE LIMIT 1
) WHERE agent_id IS NULL;

UPDATE functions f SET agent_id = (
    SELECT a.id FROM agents a WHERE a.account_id = f.account_id AND a.is_default = TRUE LIMIT 1
) WHERE agent_id IS NULL;

UPDATE knowledge_base kb SET agent_id = (
    SELECT a.id FROM agents a WHERE a.account_id = kb.account_id AND a.is_default = TRUE LIMIT 1
) WHERE agent_id IS NULL;

UPDATE ghl_integrations gi SET agent_id = (
    SELECT a.id FROM agents a WHERE a.account_id = gi.account_id AND a.is_default = TRUE LIMIT 1
) WHERE agent_id IS NULL;
`;

export async function POST(request: NextRequest) {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();

    try {
      await client.query(migrationSQL);

      const agentsCount = await client.query('SELECT COUNT(*) FROM agents');
      const accountsCount = await client.query('SELECT COUNT(*) FROM accounts WHERE max_agents IS NOT NULL');

      client.release();
      await pool.end();

      return NextResponse.json({
        success: true,
        message: 'Multi-agent migration completed successfully',
        stats: {
          agents: agentsCount.rows[0].count,
          accounts: accountsCount.rows[0].count
        }
      });
    } catch (error: any) {
      client.release();
      await pool.end();
      throw error;
    }
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
