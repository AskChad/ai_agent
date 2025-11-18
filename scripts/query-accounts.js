const https = require('https');

const SUPABASE_URL = 'mdccswzjwfyrzahbhduu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY2Nzd3pqd2Z5cnphaGJoZHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3MzMzNiwiZXhwIjoyMDc3OTQ5MzM2fQ.WhkvI7y3q3-KpRH94FUDWEJ2Wv-AS7xHAUs8ATvAmTE';

https.globalAgent = new https.Agent({
  family: 4,
  keepAlive: true
});

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: path,
      method: 'GET',
      family: 4,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Accept': 'application/json'
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

    req.end();
  });
}

async function queryAccounts() {
  console.log('🔍 Querying accounts table...\n');

  try {
    // Query all accounts
    console.log('1. Getting all accounts:');
    let response = await makeRequest('/rest/v1/accounts?select=*');
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Data: ${response.body}\n`);

    // Query specific account
    console.log('2. Querying account with ghl_location_id=test_location_456:');
    response = await makeRequest('/rest/v1/accounts?ghl_location_id=eq.test_location_456&select=*');
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Data: ${response.body}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

queryAccounts();
