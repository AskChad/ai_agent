-- Create oauth_app_configs table for storing OAuth app credentials
CREATE TABLE IF NOT EXISTS oauth_app_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  app_name TEXT,
  app_description TEXT,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL, -- Encrypted
  redirect_uri TEXT NOT NULL,
  scopes TEXT,
  agency_exchange BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES accounts(id),
  updated_by UUID REFERENCES accounts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_oauth_app_configs_provider ON oauth_app_configs(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_app_configs_is_active ON oauth_app_configs(is_active);

-- Add RLS policies
ALTER TABLE oauth_app_configs ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view configs
CREATE POLICY "Users can view oauth app configs"
  ON oauth_app_configs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only the account owner can insert/update/delete configs
CREATE POLICY "Account owners can manage oauth app configs"
  ON oauth_app_configs FOR ALL
  USING (auth.uid() = created_by);
