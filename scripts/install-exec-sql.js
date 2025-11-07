const { Client } = require('pg');
const dns = require('dns').promises;
const fs = require('fs');

const SUPABASE_HOST = 'db.mdccswzjwfyrzahbhduu.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY2Nzd3pqd2Z5cnphaGJoZHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3MzMzNiwiZXhwIjoyMDc3OTQ5MzM2fQ.WhkvI7y3q3-KpRH94FUDWEJ2Wv-AS7xHAUs8ATvAmTE';

async function resolveIPv4(hostname) {
  try {
    console.log(`🔍 Resolving ${hostname} to IPv4...`);
    const addresses = await dns.resolve4(hostname);
    const ipv4 = addresses[0];
    console.log(`✅ Resolved to: ${ipv4}\n`);
    return ipv4;
  } catch (error) {
    console.error(`❌ DNS resolution failed: ${error.message}`);
    throw error;
  }
}

async function installExecSql() {
  console.log('🚀 Installing exec_sql function...\n');

  // Resolve hostname to IPv4
  const ipv4Address = await resolveIPv4(SUPABASE_HOST);

  // Connect using IPv4 address directly
  const client = new Client({
    host: ipv4Address,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: SERVICE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    console.log(`📡 Connecting to ${ipv4Address}:5432...`);
    await client.connect();
    console.log('✅ Connected to database!\n');

    // Read and execute the exec_sql installation script
    console.log('📝 Installing exec_sql function...');
    const sqlContent = fs.readFileSync('./database/migrations/000_install_exec_sql.sql', 'utf8');
    await client.query(sqlContent);

    console.log('✅ exec_sql function installed successfully!\n');

    // Verify installation
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.routines
      WHERE routine_name = 'exec_sql'
    `);

    if (result.rows[0].count > 0) {
      console.log('✅ Verification passed: exec_sql function is available\n');
      console.log('🎉 You can now run migrations via API!');
      return true;
    } else {
      console.error('❌ Verification failed: exec_sql function not found');
      return false;
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error('Error code:', error.code);
    console.error('\n💡 Please run this SQL file manually in Supabase SQL Editor:');
    console.error('   File: ./database/migrations/000_install_exec_sql.sql');
    console.error('   URL: https://supabase.com/dashboard/project/mdccswzjwfyrzahbhduu/sql');
    return false;
  } finally {
    await client.end();
  }
}

installExecSql()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
