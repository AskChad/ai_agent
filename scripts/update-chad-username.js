const https = require('https');

const SUPABASE_URL = 'mdccswzjwfyrzahbhduu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY2Nzd3pqd2Z5cnphaGJoZHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3MzMzNiwiZXhwIjoyMDc3OTQ5MzM2fQ.WhkvI7y3q3-KpRH94FUDWEJ2Wv-AS7xHAUs8ATvAmTE';
const EMAIL = 'chad@askchad.net';
const ACCOUNT_NAME = 'chad';  // Simple username

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

async function updateAccountName() {
  console.log(`🔧 Updating account name for ${EMAIL} to "${ACCOUNT_NAME}"...\n`);

  try {
    const updateSQL = `
      UPDATE accounts
      SET
        account_name = '${ACCOUNT_NAME}',
        updated_at = NOW()
      WHERE id IN (
        SELECT id FROM auth.users WHERE email = '${EMAIL}'
      )
      RETURNING id, account_name, is_platform_admin, max_agents;
    `;

    const response = await makeRequest(JSON.stringify({ query: updateSQL }));

    if (response.statusCode === 200) {
      console.log('✅ Account name updated successfully!');
      console.log('Response:', response.body);
      console.log('\n' + '='.repeat(60));
      console.log('✅ Updated Account Information:');
      console.log('='.repeat(60));
      console.log(`📧 Email: ${EMAIL}`);
      console.log(`👤 Account Name: ${ACCOUNT_NAME}`);
      console.log('🔑 Platform Admin: TRUE');
      console.log('🤖 Max Agents: 0 (unlimited)');
      console.log('='.repeat(60));
    } else {
      console.error('❌ Failed to update account name');
      console.error('Response:', response.body);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateAccountName();
