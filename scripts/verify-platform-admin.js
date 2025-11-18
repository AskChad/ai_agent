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

async function verifyPlatformAdmin() {
  console.log(`🔍 Verifying platform admin status for ${EMAIL}...\n`);

  const verifySQL = `
    SELECT
      a.id,
      a.account_name,
      a.is_platform_admin,
      a.max_agents,
      a.is_active,
      u.email,
      a.created_at,
      a.updated_at
    FROM accounts a
    JOIN auth.users u ON a.id = u.id
    WHERE u.email = '${EMAIL}';
  `;

  try {
    const response = await makeRequest(JSON.stringify({ query: verifySQL }));

    if (response.statusCode !== 200) {
      console.error(`❌ Query failed: HTTP ${response.statusCode}`);
      console.error('Response:', response.body);
      process.exit(1);
    }

    console.log('✅ Successfully retrieved account information!\n');
    console.log('Response:', response.body);
    console.log('\n📊 Account Status:');
    console.log(`   Email: ${EMAIL}`);
    console.log('   Platform Admin: Should be TRUE');
    console.log('   Max Agents: Should be 0 (unlimited)');
    console.log('   Active: Should be TRUE');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyPlatformAdmin();
