-- Migration: Add direction and source fields to messages table
-- Purpose: Track message flow and distinguish AI vs Human vs Automation responses
-- Date: 2025-11-18

-- Add direction column (inbound = from contact, outbound = from GHL to contact)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS direction TEXT
CHECK (direction IN ('inbound', 'outbound'));

-- Add source column to identify who sent the message
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS source TEXT
CHECK (source IN ('contact', 'ai_agent', 'ghl_user', 'ghl_automation', 'system'));

-- Add index for filtering by source
CREATE INDEX IF NOT EXISTS idx_messages_source ON messages(source);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_messages_direction_source ON messages(direction, source);

-- Update existing messages with default values based on role
-- Existing 'user' messages are from contacts (inbound)
UPDATE messages
SET
  direction = 'inbound',
  source = 'contact'
WHERE role = 'user' AND direction IS NULL;

-- Existing 'assistant' messages are from AI (outbound)
UPDATE messages
SET
  direction = 'outbound',
  source = 'ai_agent'
WHERE role = 'assistant' AND direction IS NULL;

-- Existing 'system' messages are system-generated (outbound)
UPDATE messages
SET
  direction = 'outbound',
  source = 'system'
WHERE role = 'system' AND direction IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN messages.direction IS 'Message direction: inbound (contact→GHL) or outbound (GHL→contact)';
COMMENT ON COLUMN messages.source IS 'Message source: contact, ai_agent, ghl_user, ghl_automation, or system';

-- Verification query
SELECT
  direction,
  source,
  role,
  COUNT(*) as count
FROM messages
GROUP BY direction, source, role
ORDER BY direction, source;
