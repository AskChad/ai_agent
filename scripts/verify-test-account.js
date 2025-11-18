const https = require('https');

const SUPABASE_URL = 'mdccswzjwfyrzahbhduu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY2Nzd3pqd2Z5cnphaGJoZHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3MzMzNiwiZXhwIjoyMDc3OTQ5MzM2fQ.WhkvI7y3q3-KpRH94FUDWEJ2Wv-AS7xHAUs8ATvAmTE';

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

async function verifyAccount() {
  console.log('🔍 Verifying test account in database...\n');

  const sql = `
    SELECT id, ghl_location_id, account_name, is_active, created_at
    FROM accounts
    WHERE ghl_location_id = 'test_location_456';
  `;

  try {
    const response = await makeRequest(JSON.stringify({ query: sql }));

    console.log(`HTTP Status: ${response.statusCode}\n`);
    console.log('Response:', response.body);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyAccount();
