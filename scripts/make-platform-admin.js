const https = require('https');

const SUPABASE_URL = 'mdccswzjwfyrzahbhduu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY2Nzd3pqd2Z5cnphaGJoZHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3MzMzNiwiZXhwIjoyMDc3OTQ5MzM2fQ.WhkvI7y3q3-KpRH94FUDWEJ2Wv-AS7xHAUs8ATvAmTE';
const EMAIL = 'chad@askchad.net';

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

async function makePlatformAdmin() {
  console.log(`🔧 Making ${EMAIL} a platform admin...\n`);

  // Step 1: Find the user in Supabase Auth by email
  const findUserSQL = `
    SELECT id, email
    FROM auth.users
    WHERE email = '${EMAIL}'
    LIMIT 1;
  `;

  try {
    console.log('📧 Looking up user by email...');
    const response1 = await makeRequest(JSON.stringify({ query: findUserSQL }));

    if (response1.statusCode !== 200) {
      console.error(`❌ Failed to find user: HTTP ${response1.statusCode}`);
      console.error('Response:', response1.body);
      process.exit(1);
    }

    console.log('User lookup response:', response1.body);

    // Parse the response to get user ID
    let userId;
    try {
      const result = JSON.parse(response1.body);
      // The exec_sql function returns results in a specific format
      // We need to parse the actual result from the response
      console.log('Parsed result:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('Could not parse as JSON, checking raw response');
    }

    // Step 2: Update accounts table to set is_platform_admin = true
    const updateSQL = `
      UPDATE accounts
      SET
        is_platform_admin = TRUE,
        max_agents = 0,
        updated_at = NOW()
      WHERE id IN (
        SELECT id FROM auth.users WHERE email = '${EMAIL}'
      )
      RETURNING id, account_name, is_platform_admin, max_agents;
    `;

    console.log('\n🔄 Updating account to platform admin...');
    const response2 = await makeRequest(JSON.stringify({ query: updateSQL }));

    console.log(`HTTP Status: ${response2.statusCode}\n`);

    if (response2.statusCode === 200 || response2.statusCode === 201 || response2.statusCode === 204) {
      console.log('✅ Successfully updated account!\n');
      console.log('Response:', response2.body);

      console.log('\n✅ Platform admin privileges granted!');
      console.log(`📧 Email: ${EMAIL}`);
      console.log('🔑 Privileges:');
      console.log('   - is_platform_admin: TRUE');
      console.log('   - max_agents: 0 (unlimited)');
      console.log('   - Can manage all accounts');
      process.exit(0);
    } else {
      console.error(`❌ Update failed: HTTP ${response2.statusCode}`);
      console.error('Response:', response2.body);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Please ensure:');
    console.error(`   1. User ${EMAIL} is registered in the system`);
    console.error('   2. Database connection is working');
    console.error('   3. exec_sql function is installed');
    process.exit(1);
  }
}

makePlatformAdmin();
