// Script to apply database migrations using Supabase REST API
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('Checking if accounts table exists...');

  // First, check if tables exist
  const { data: existingTables, error: checkError } = await supabase
    .from('accounts')
    .select('id')
    .limit(1);

  if (checkError && checkError.code === '42P01') {
    console.log('Tables do not exist. Need to run migrations via Supabase Dashboard.');
    console.log('\nPlease run the following migrations in order via Supabase SQL Editor:');
    console.log('1. supabase/migrations/001_initial_schema.sql');
    console.log('2. database/migrations/create_oauth_app_configs.sql');
    return;
  }

  if (checkError) {
    console.log('Error checking tables:', checkError);
    return;
  }

  console.log('Accounts table exists.');

  // Check oauth_app_configs table
  const { data: oauthConfigs, error: oauthError } = await supabase
    .from('oauth_app_configs')
    .select('id')
    .limit(1);

  if (oauthError && oauthError.code === '42P01') {
    console.log('\noauth_app_configs table does not exist.');
    console.log('Please run database/migrations/create_oauth_app_configs.sql via Supabase SQL Editor.');
    return;
  }

  if (oauthError) {
    console.log('Error checking oauth_app_configs:', oauthError);
    return;
  }

  console.log('oauth_app_configs table exists.');
  console.log('\nAll required tables exist!');
}

runMigration().catch(console.error);
