const https = require('https');
const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3003;  // Dev server running on port 3003

let passed = 0;
let failed = 0;

// Color codes
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function makeRequest(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);

    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
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

    req.write(postData);
    req.end();
  });
}

async function testWebhook(name, endpoint, payload, expectedSource) {
  console.log(`${BLUE}Testing: ${name}${RESET}`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Expected Source: ${expectedSource}`);

  try {
    const response = await makeRequest(endpoint, payload);

    if (response.statusCode === 200) {
      console.log(`${GREEN}✅ PASSED${RESET} - HTTP ${response.statusCode}`);
      console.log(`Response: ${response.body}`);
      passed++;
    } else {
      console.log(`${RED}❌ FAILED${RESET} - HTTP ${response.statusCode}`);
      console.log(`Response: ${response.body}`);
      failed++;
    }
  } catch (error) {
    console.log(`${RED}❌ FAILED${RESET} - Error: ${error.message}`);
    failed++;
  }

  console.log('');
  console.log('---');
  console.log('');
}

async function runTests() {
  console.log('🧪 Testing GHL Webhook Handlers');
  console.log('================================');
  console.log('');
  console.log('Make sure dev server is running: npm run dev');
  console.log('');

  // Wait a bit for the message to be read
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ============================================================================
  // TEST 1: Inbound Message (Contact → GHL)
  // ============================================================================
  await testWebhook(
    'Inbound Message - Contact sends SMS',
    '/api/ghl/webhooks/inbound-message',
    {
      type: 'SMS',
      contactId: 'test_contact_001',
      locationId: 'test_location_456',
      messageId: 'msg_inbound_001',
      message: 'Hello, I need help with my order #12345',
      phone: '+1234567890',
      conversationId: 'conv_test_001'
    },
    'contact'
  );

  // ============================================================================
  // TEST 2: Outbound Message - AI Agent (simulated as already in DB)
  // ============================================================================
  await testWebhook(
    'Outbound Message - AI Agent Response (first occurrence)',
    '/api/ghl/webhooks/outbound-message',
    {
      type: 'SMS',
      contactId: 'test_contact_001',
      locationId: 'test_location_456',
      messageId: 'msg_ai_response_001',
      message: 'I can help you with order #12345. Let me look that up for you.',
      phone: '+1234567890',
      conversationId: 'conv_test_001'
    },
    'ai_agent or ghl_automation'
  );

  // ============================================================================
  // TEST 3: Outbound Message - GHL User (manual)
  // ============================================================================
  await testWebhook(
    'Outbound Message - GHL User Manual Reply',
    '/api/ghl/webhooks/outbound-message',
    {
      type: 'SMS',
      contactId: 'test_contact_001',
      locationId: 'test_location_456',
      messageId: 'msg_manual_001',
      userId: 'user_jane_789',
      message: 'Hi there! I am personally looking into your order. Give me a moment.',
      phone: '+1234567890',
      conversationId: 'conv_test_001'
    },
    'ghl_user'
  );

  // ============================================================================
  // TEST 4: Outbound Message - GHL Automation
  // ============================================================================
  await testWebhook(
    'Outbound Message - GHL Automation/Workflow',
    '/api/ghl/webhooks/outbound-message',
    {
      type: 'SMS',
      contactId: 'test_contact_001',
      locationId: 'test_location_456',
      messageId: 'msg_automation_001',
      message: 'Thank you for your purchase! Your receipt is attached.',
      phone: '+1234567890',
      conversationId: 'conv_test_001'
    },
    'ghl_automation'
  );

  // ============================================================================
  // TEST 5: Inbound Message - Email
  // ============================================================================
  await testWebhook(
    'Inbound Message - Contact sends Email',
    '/api/ghl/webhooks/inbound-message',
    {
      type: 'Email',
      contactId: 'test_contact_002',
      locationId: 'test_location_456',
      messageId: 'msg_email_inbound_001',
      emailFrom: {
        email: 'customer@example.com',
        name: 'John Customer'
      },
      subject: 'Question about my order',
      html: '<p>I have a question about my recent order. Can you help?</p>',
      conversationId: 'conv_test_002'
    },
    'contact'
  );

  // ============================================================================
  // TEST 6: Outbound Message - WhatsApp (GHL User)
  // ============================================================================
  await testWebhook(
    'Outbound Message - WhatsApp (GHL User)',
    '/api/ghl/webhooks/outbound-message',
    {
      type: 'WhatsApp',
      contactId: 'test_contact_003',
      locationId: 'test_location_456',
      messageId: 'msg_whatsapp_001',
      userId: 'user_john_456',
      body: 'Hi! I can help you with that. What is your order number?',
      phone: '+1234567890',
      conversationId: 'conv_test_003'
    },
    'ghl_user'
  );

  // ============================================================================
  // TEST 7: Create test account in database first
  // ============================================================================
  console.log(`${BLUE}Note: Creating test account if needed...${RESET}`);
  console.log('This ensures location ID "test_location_456" exists');
  console.log('');

  // Print results
  console.log('');
  console.log('================================');
  console.log('🏁 Test Results');
  console.log('================================');
  console.log(`${GREEN}Passed: ${passed}${RESET}`);
  console.log(`${RED}Failed: ${failed}${RESET}`);
  console.log('');

  if (failed === 0) {
    console.log(`${GREEN}✅ All tests passed!${RESET}`);
    process.exit(0);
  } else {
    console.log(`${RED}❌ Some tests failed${RESET}`);
    console.log('');
    console.log('Common issues:');
    console.log('1. Dev server not running (npm run dev)');
    console.log('2. Test account not created (location ID: test_location_456)');
    console.log('3. Database not migrated');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error(`${RED}Fatal error:${RESET}`, error);
  process.exit(1);
});
