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

async function ensureChadAccount() {
  console.log(`🔧 Ensuring account exists for ${EMAIL}...\n`);

  try {
    // Step 1: Check if user exists in auth.users
    console.log('📧 Step 1: Checking if user exists in auth.users...');
    const checkUserSQL = `
      SELECT id, email, created_at
      FROM auth.users
      WHERE email = '${EMAIL}';
    `;

    const userResponse = await makeRequest(JSON.stringify({ query: checkUserSQL }));
    console.log('User check response:', userResponse.body);

    // Step 2: Check if account exists
    console.log('\n📊 Step 2: Checking if account exists...');
    const checkAccountSQL = `
      SELECT a.id, a.account_name, a.is_platform_admin, a.max_agents, a.is_active
      FROM accounts a
      JOIN auth.users u ON a.id = u.id
      WHERE u.email = '${EMAIL}';
    `;

    const accountResponse = await makeRequest(JSON.stringify({ query: checkAccountSQL }));
    console.log('Account check response:', accountResponse.body);

    // Step 3: Create or update account
    console.log('\n🔨 Step 3: Creating/updating account entry...');
    const upsertAccountSQL = `
      INSERT INTO accounts (id, account_name, is_platform_admin, max_agents, is_active)
      SELECT
        u.id,
        'Chad Knowlton' as account_name,
        TRUE as is_platform_admin,
        0 as max_agents,
        TRUE as is_active
      FROM auth.users u
      WHERE u.email = '${EMAIL}'
      ON CONFLICT (id) DO UPDATE SET
        account_name = EXCLUDED.account_name,
        is_platform_admin = TRUE,
        max_agents = 0,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING id, account_name, is_platform_admin, max_agents, is_active;
    `;

    const upsertResponse = await makeRequest(JSON.stringify({ query: upsertAccountSQL }));

    if (upsertResponse.statusCode === 200) {
      console.log('✅ Account created/updated successfully!');
      console.log('Response:', upsertResponse.body);
    } else {
      console.error('❌ Failed to create/update account');
      console.error('Response:', upsertResponse.body);
      process.exit(1);
    }

    // Step 4: Verify the final state
    console.log('\n✅ Step 4: Verifying final account state...');
    const verifySQL = `
      SELECT
        a.id,
        a.account_name,
        a.is_platform_admin,
        a.max_agents,
        a.is_active,
        u.email
      FROM accounts a
      JOIN auth.users u ON a.id = u.id
      WHERE u.email = '${EMAIL}';
    `;

    const verifyResponse = await makeRequest(JSON.stringify({ query: verifySQL }));
    console.log('Final verification:', verifyResponse.body);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Account Setup Complete!');
    console.log('='.repeat(60));
    console.log(`📧 Email: ${EMAIL}`);
    console.log('👤 Account Name: Chad Knowlton');
    console.log('🔑 Platform Admin: TRUE');
    console.log('🤖 Max Agents: 0 (unlimited)');
    console.log('✅ Active: TRUE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

ensureChadAccount();
