# Message Source Tracking Implementation

## Overview

Complete implementation for tracking conversation history with proper message direction and source classification. This enables:
- **Direction tracking**: Inbound (contact → GHL) vs Outbound (GHL → contact)
- **Source identification**: AI Agent, GHL User, GHL Automation, or Contact
- **Better analytics**: Response rates by source, human intervention tracking
- **Context awareness**: AI knows when humans have taken over

---

## Database Schema

### New Fields Added to `messages` Table

```sql
direction TEXT CHECK (direction IN ('inbound', 'outbound'))
source TEXT CHECK (source IN ('contact', 'ai_agent', 'ghl_user', 'ghl_automation', 'system'))
```

### Classification Matrix

| Direction | Source | Role | Description |
|-----------|--------|------|-------------|
| `inbound` | `contact` | `user` | Customer sends message to GHL |
| `outbound` | `ai_agent` | `assistant` | AI generates and sends response |
| `outbound` | `ghl_user` | `user` | Human agent manually replies |
| `outbound` | `ghl_automation` | `system` | GHL workflow/automation sends |

---

## GHL Webhook Events

### 1. InboundMessage Webhook

**Endpoint**: `/api/ghl/webhooks/inbound-message`

**Triggered when**: Contact sends a message TO GHL

**Example Payload**:
```json
{
  "type": "SMS",
  "contactId": "contact_123",
  "locationId": "location_456",
  "messageId": "msg_789",
  "message": "Hello, I need help with my order",
  "conversationId": "conv_abc"
}
```

**Processing Logic**:
1. Validate payload
2. Find account by `locationId`
3. Find or create conversation by `contactId`
4. Store message with:
   - `direction: 'inbound'`
   - `source: 'contact'`
   - `role: 'user'`
5. Trigger AI response generation (if enabled)

---

### 2. OutboundMessage Webhook

**Endpoint**: `/api/ghl/webhooks/outbound-message`

**Triggered when**: A message is sent FROM GHL TO contact

**Example Payloads**:

**AI Agent Response**:
```json
{
  "type": "SMS",
  "contactId": "contact_123",
  "locationId": "location_456",
  "messageId": "msg_ai_999",
  "message": "Your order #1234 is out for delivery!",
  "userId": null  // No userId = not manual
}
```

**Manual GHL User Response**:
```json
{
  "type": "SMS",
  "contactId": "contact_123",
  "locationId": "location_456",
  "messageId": "msg_manual_888",
  "userId": "user_789",  // userId present = manual
  "message": "Let me check that for you personally"
}
```

**GHL Automation Response**:
```json
{
  "type": "SMS",
  "contactId": "contact_123",
  "locationId": "location_456",
  "messageId": "msg_auto_777",
  "userId": null,  // No userId
  "message": "Thanks for your purchase! Here's your receipt..."
}
```

---

## Smart Source Detection Algorithm

The `OutboundMessage` webhook uses a 3-step algorithm to determine the source:

### Step 1: Check Database for Existing Message

```typescript
const { data: existingMessage } = await supabase
  .from('messages')
  .select('id, role, source')
  .eq('conversation_id', conversationId)
  .eq('ghl_message_id', message.messageId)
  .maybeSingle();

if (existingMessage && existingMessage.role === 'assistant') {
  // ✅ This is our AI agent's message
  return { source: 'ai_agent', role: 'assistant' };
}
```

**Logic**: If we already stored this message with `role='assistant'`, it means OUR AI agent sent it via the GHL API. The webhook is just echoing it back to us.

### Step 2: Check for userId in Payload

```typescript
if (message.userId) {
  // ✅ GHL user sent this manually
  return { source: 'ghl_user', role: 'user' };
}
```

**Logic**: If `userId` is present in the payload, a human GHL user manually sent this message.

### Step 3: Default to GHL Automation

```typescript
// ✅ GHL automation/workflow sent this
return { source: 'ghl_automation', role: 'system' };
```

**Logic**: If no `userId` and not in our database, it must be from a GHL automation or workflow.

---

## Implementation Flow

### When Contact Sends Message (Inbound)

```
1. Contact sends "I need help" via SMS
   ↓
2. GHL triggers InboundMessage webhook → /api/ghl/webhooks/inbound-message
   ↓
3. Store in DB:
   - direction: 'inbound'
   - source: 'contact'
   - role: 'user'
   ↓
4. Trigger AI processing (if enabled)
   ↓
5. AI generates response
   ↓
6. Store AI response in DB FIRST:
   - direction: 'outbound'
   - source: 'ai_agent'
   - role: 'assistant'
   - ghl_message_id: PENDING (until sent)
   ↓
7. Send via GHL API
   ↓
8. Update ghl_message_id with response from GHL
   ↓
9. GHL triggers OutboundMessage webhook (echoing our message)
   ↓
10. Smart detection sees it's already in DB → Skip duplicate or update
```

### When GHL User Sends Manual Reply

```
1. GHL user clicks "Reply" and types message
   ↓
2. GHL sends message to contact
   ↓
3. GHL triggers OutboundMessage webhook → /api/ghl/webhooks/outbound-message
   ↓
4. Payload includes userId field
   ↓
5. Smart detection: userId present → ghl_user
   ↓
6. Store in DB:
   - direction: 'outbound'
   - source: 'ghl_user'
   - role: 'user'
   ↓
7. AI context loader sees human took over
   ↓
8. Next AI response acknowledges human intervention
```

### When GHL Automation Sends

```
1. GHL workflow triggers (e.g., "New contact" automation)
   ↓
2. Workflow sends welcome message
   ↓
3. GHL triggers OutboundMessage webhook
   ↓
4. Payload has no userId, not in our DB
   ↓
5. Smart detection: Default to ghl_automation
   ↓
6. Store in DB:
   - direction: 'outbound'
   - source: 'ghl_automation'
   - role: 'system'
```

---

## Analytics & Queries

### Response Rate by Source

```sql
SELECT
  source,
  COUNT(*) as message_count,
  ROUND(AVG(
    EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY conversation_id ORDER BY created_at)))
  ), 2) as avg_response_time_seconds
FROM messages
WHERE direction = 'outbound'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY source
ORDER BY message_count DESC;
```

**Expected Output**:
```
source           | message_count | avg_response_time_seconds
-----------------|---------------|-------------------------
ai_agent         | 15,234       | 2.5
ghl_automation   | 3,456        | 0.8
ghl_user         | 892          | 180.3
```

### Detect Human Intervention Patterns

```sql
-- Find conversations where human took over after AI
SELECT
  c.id,
  c.contact_name,
  COUNT(CASE WHEN m.source = 'ai_agent' THEN 1 END) as ai_messages,
  COUNT(CASE WHEN m.source = 'ghl_user' THEN 1 END) as human_messages,
  MAX(CASE WHEN m.source = 'ghl_user' THEN m.created_at END) as last_human_intervention
FROM conversations c
JOIN messages m ON m.conversation_id = c.id
WHERE m.direction = 'outbound'
  AND c.created_at > NOW() - INTERVAL '7 days'
GROUP BY c.id, c.contact_name
HAVING COUNT(CASE WHEN m.source = 'ghl_user' THEN 1 END) > 0
ORDER BY last_human_intervention DESC;
```

### AI Effectiveness (before human takeover)

```sql
-- How many messages did AI handle before human needed to step in?
WITH human_interventions AS (
  SELECT
    conversation_id,
    MIN(created_at) as first_human_message
  FROM messages
  WHERE source = 'ghl_user' AND direction = 'outbound'
  GROUP BY conversation_id
)
SELECT
  AVG(ai_message_count) as avg_ai_messages_before_human,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ai_message_count) as median_ai_messages
FROM (
  SELECT
    m.conversation_id,
    COUNT(*) as ai_message_count
  FROM messages m
  JOIN human_interventions hi ON hi.conversation_id = m.conversation_id
  WHERE m.source = 'ai_agent'
    AND m.created_at < hi.first_human_message
  GROUP BY m.conversation_id
) sub;
```

### Cost Tracking (AI only)

```sql
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as ai_messages,
  SUM(tokens_used) as total_tokens,
  ROUND(SUM(tokens_used) * 0.00002, 2) as estimated_cost_usd  -- Adjust rate
FROM messages
WHERE source = 'ai_agent'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
```

---

## Context Loading Improvements

### AI Knows When Human Intervened

```typescript
// In context loader
const lastOutboundMessage = messages
  .filter(m => m.direction === 'outbound')
  .sort((a, b) => b.created_at - a.created_at)[0];

if (lastOutboundMessage?.source === 'ghl_user') {
  // Human agent responded last
  systemPrompt += `

IMPORTANT: A human team member recently responded to this conversation.
They may have provided specific information or made commitments.
Acknowledge their assistance and maintain consistency with their response.`;
}
```

### Filter Out Noise from Context

```typescript
// Only load messages that matter for context
const contextMessages = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .or(`
    role.eq.user,
    role.eq.assistant,
    precedes_user_reply.eq.true
  `)
  .order('created_at', { ascending: false })
  .limit(settings.context_window_messages);
```

**Filters out**:
- GHL automation messages that don't precede user replies
- System messages that aren't relevant to conversation

---

## Migration Script

**File**: `database/migrations/008_add_message_direction_source.sql`

```sql
-- Add new columns
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS direction TEXT
CHECK (direction IN ('inbound', 'outbound'));

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS source TEXT
CHECK (source IN ('contact', 'ai_agent', 'ghl_user', 'ghl_automation', 'system'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_messages_source ON messages(source);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_direction_source ON messages(direction, source);

-- Backfill existing data
UPDATE messages SET direction = 'inbound', source = 'contact'
WHERE role = 'user' AND direction IS NULL;

UPDATE messages SET direction = 'outbound', source = 'ai_agent'
WHERE role = 'assistant' AND direction IS NULL;

UPDATE messages SET direction = 'outbound', source = 'system'
WHERE role = 'system' AND direction IS NULL;
```

---

## Testing

### Test Scenarios

#### 1. Test Inbound Message (Contact → GHL)

```bash
curl -X POST http://localhost:3000/api/ghl/webhooks/inbound-message \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SMS",
    "contactId": "test_contact_123",
    "locationId": "test_location_456",
    "messageId": "msg_inbound_001",
    "message": "Hello, I need help"
  }'
```

**Expected Result**:
- Message stored with `direction='inbound'`, `source='contact'`
- AI response triggered (if enabled)

#### 2. Test Outbound - AI Response

```bash
# First, AI sends message via GHL API (stores in DB first)
# Then GHL echoes it back via webhook:

curl -X POST http://localhost:3000/api/ghl/webhooks/outbound-message \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SMS",
    "contactId": "test_contact_123",
    "locationId": "test_location_456",
    "messageId": "msg_ai_response_001",
    "message": "How can I help you today?",
    "userId": null
  }'
```

**Expected Result**:
- Finds existing message in DB
- Classified as `source='ai_agent'`

#### 3. Test Outbound - Manual GHL User

```bash
curl -X POST http://localhost:3000/api/ghl/webhooks/outbound-message \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SMS",
    "contactId": "test_contact_123",
    "locationId": "test_location_456",
    "messageId": "msg_manual_001",
    "message": "Let me personally help you with that",
    "userId": "user_jane_789"
  }'
```

**Expected Result**:
- `userId` present → Classified as `source='ghl_user'`
- Message stored with `direction='outbound'`, `source='ghl_user'`, `role='user'`

#### 4. Test Outbound - GHL Automation

```bash
curl -X POST http://localhost:3000/api/ghl/webhooks/outbound-message \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SMS",
    "contactId": "test_contact_123",
    "locationId": "test_location_456",
    "messageId": "msg_automation_001",
    "message": "Welcome to our service! Thanks for signing up.",
    "userId": null
  }'
```

**Expected Result**:
- No `userId`, not in DB → Classified as `source='ghl_automation'`
- Message stored with `direction='outbound'`, `source='ghl_automation'`, `role='system'`

### Verification Queries

```sql
-- Check message distribution
SELECT direction, source, role, COUNT(*)
FROM messages
GROUP BY direction, source, role;

-- Verify no duplicates for AI messages
SELECT ghl_message_id, COUNT(*)
FROM messages
WHERE source = 'ai_agent'
GROUP BY ghl_message_id
HAVING COUNT(*) > 1;
```

---

## Benefits

### 1. Better Analytics
- Track AI vs Human response rates
- Measure AI effectiveness before human intervention needed
- Calculate accurate costs (AI messages only)

### 2. Context Awareness
- AI knows when humans have taken over
- Can reference human agent responses
- Maintain consistency with manual interventions

### 3. Conversation Quality
- Filter automation noise from context
- Focus on meaningful conversation turns
- Understand conversation flow patterns

### 4. Operational Insights
- Identify when/why humans step in
- Optimize AI to reduce human intervention needs
- Track automation effectiveness

---

## Files Changed

- ✅ `database/migrations/008_add_message_direction_source.sql` - Schema changes
- ✅ `app/api/ghl/webhooks/inbound-message/route.ts` - Inbound handler (NEW)
- ✅ `app/api/ghl/webhooks/outbound-message/route.ts` - Outbound handler (UPDATED)
- ✅ `docs/MESSAGE_SOURCE_TRACKING.md` - This documentation

---

## Next Steps

1. Deploy migration to database
2. Test webhook handlers with real GHL events
3. Update context loader to use new fields
4. Create analytics dashboard showing source breakdown
5. Train AI to acknowledge human interventions

---

**Version**: 1.0
**Date**: 2025-11-18
**Status**: Ready for Testing
