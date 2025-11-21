-- GHL Sessions Table for SDK Token Storage
-- This table stores OAuth tokens per location for the GHL SDK

CREATE TABLE IF NOT EXISTS ghl_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL UNIQUE,
  company_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  user_type TEXT, -- 'Location' or 'Company'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ghl_sessions_location_id ON ghl_sessions(location_id);
CREATE INDEX IF NOT EXISTS idx_ghl_sessions_company_id ON ghl_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_ghl_sessions_expires_at ON ghl_sessions(expires_at);

-- RLS Policies
ALTER TABLE ghl_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for SDK operations)
CREATE POLICY "Service role can manage ghl_sessions"
  ON ghl_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ghl_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_ghl_sessions_updated_at ON ghl_sessions;
CREATE TRIGGER trigger_ghl_sessions_updated_at
  BEFORE UPDATE ON ghl_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_ghl_sessions_updated_at();
