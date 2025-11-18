const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'mdccswzjwfyrzahbhduu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY2Nzd3pqd2Z5cnphaGJoZHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3MzMzNiwiZXhwIjoyMDc3OTQ5MzM2fQ.WhkvI7y3q3-KpRH94FUDWEJ2Wv-AS7xHAUs8ATvAmTE';

// Force IPv4
https.globalAgent = new https.Agent({
  family: 4,
  keepAlive: true
});

function makeRequest(payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      family: 4,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

async function deployMigration() {
  console.log('📦 Deploying Message Source Tracking Migration...\n');

  const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '008_add_message_direction_source.sql');

  console.log(`Reading migration file: ${migrationPath}`);
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  try {
    console.log('🚀 Executing migration...\n');
    const response = await makeRequest(JSON.stringify({ query: sqlContent }));

    console.log(`HTTP Status: ${response.statusCode}\n`);

    if (response.statusCode === 200 || response.statusCode === 201 || response.statusCode === 204) {
      console.log('✅ Migration deployed successfully!\n');
      console.log('Response:', response.body);

      console.log('\n📋 Changes Applied:');
      console.log('   - direction column added to messages table');
      console.log('   - source column added to messages table');
      console.log('   - Indexes created for performance (source, direction)');
      console.log('   - Existing messages backfilled with default values');
      console.log('\n📊 Message Classification Now Available:');
      console.log('   Direction: inbound (contact → GHL) | outbound (GHL → contact)');
      console.log('   Source: contact | ai_agent | ghl_user | ghl_automation | system');

      // Verify the migration
      console.log('\n🔍 Verifying migration...');
      const verifyQuery = `
        SELECT
          direction,
          source,
          role,
          COUNT(*) as count
        FROM messages
        GROUP BY direction, source, role
        ORDER BY direction, source;
      `;

      const verifyResponse = await makeRequest(JSON.stringify({ query: verifyQuery }));
      console.log('\n📊 Current Message Distribution:');
      console.log(verifyResponse.body);

      process.exit(0);
    } else {
      console.error(`❌ Migration failed: HTTP ${response.statusCode}`);
      console.error('Response:', response.body);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

deployMigration();
