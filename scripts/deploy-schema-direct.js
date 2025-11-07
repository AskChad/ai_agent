const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Read .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const DB_HOST = 'db.mdccswzjwfyrzahbhduu.supabase.co';
const DB_PASSWORD = envVars.DB_PASSWORD;
const SQL_FILE = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');

async function deploySchema() {
  console.log('🚀 Deploying database schema via curl...\n');

  try {
    // Read SQL file
    const sql = fs.readFileSync(SQL_FILE, 'utf8');

    // Save to temp file for curl
    const tempFile = '/tmp/schema.sql';
    fs.writeFileSync(tempFile, sql);

    console.log('📄 SQL file prepared');
    console.log('🔌 Connecting to database...\n');

    // Use curl to execute via Supabase REST API
    const curlCommand = `curl -X POST "https://mdccswzjwfyrzahbhduu.supabase.co/rest/v1/rpc/query" \
      -H "apikey: ${envVars.SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${envVars.SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"query": ${JSON.stringify(sql)}}'`;

    console.log('⚠️  Note: Using direct PostgreSQL connection is recommended for large schemas.');
    console.log('📝 Alternative: Use Supabase SQL Editor in dashboard\n');
    console.log('🌐 Dashboard: https://supabase.com/dashboard/project/mdccswzjwfyrzahbhduu/editor/sql\n');

    console.log('✅ SQL file ready at:', tempFile);
    console.log('\n📋 Manual deployment instructions:');
    console.log('1. Go to: https://supabase.com/dashboard/project/mdccswzjwfyrzahbhduu/editor/sql');
    console.log('2. Click "New Query"');
    console.log('3. Copy and paste the SQL from:', SQL_FILE);
    console.log('4. Click "Run" to execute\n');

    console.log('Or use this command if psql is installed:');
    console.log(`PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -U postgres -d postgres -f ${SQL_FILE}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deploySchema();
