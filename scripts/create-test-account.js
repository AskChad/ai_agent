const https = require('https');

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

async function createTestAccount() {
  console.log('🧪 Creating Test Account for Webhook Testing...\n');

  const sql = `
    -- Create test account
    INSERT INTO accounts (ghl_location_id, account_name, is_active)
    VALUES ('test_location_456', 'Test Account for Webhooks', true)
    ON CONFLICT (ghl_location_id) DO UPDATE
    SET account_name = EXCLUDED.account_name,
        is_active = true,
        updated_at = NOW()
    RETURNING id, ghl_location_id, account_name;
  `;

  try {
    console.log('📝 Executing SQL...\n');
    const response = await makeRequest(JSON.stringify({ query: sql }));

    console.log(`HTTP Status: ${response.statusCode}\n`);

    if (response.statusCode === 200 || response.statusCode === 201 || response.statusCode === 204) {
      console.log('✅ Test account created/updated successfully!\n');
      console.log('Response:', response.body);

      console.log('\n📋 Test Account Details:');
      console.log('   - GHL Location ID: test_location_456');
      console.log('   - Account Name: Test Account for Webhooks');
      console.log('   - Status: Active');
      console.log('\n✨ Ready to test webhooks!');
      console.log('   Run: node scripts/test-webhooks.js');

      process.exit(0);
    } else {
      console.error(`❌ Failed: HTTP ${response.statusCode}`);
      console.error('Response:', response.body);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestAccount();
