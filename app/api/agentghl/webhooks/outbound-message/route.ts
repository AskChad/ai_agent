/**
 * GHL Outbound Message Webhook Handler
 * Tracks outgoing messages sent through GoHighLevel
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Webhook secret for signature validation
const WEBHOOK_SECRET = process.env.GHL_WEBHOOK_SECRET || '';

interface OutboundMessagePayload {
  type: string;
  locationId: string;
  contactId: string;
  conversationId: string;
  messageId: string;
  body: string;
  direction: string;
  contentType: string;
  dateAdded: string;
  messageType: string;
  userId?: string;
  status?: string;
  attachments?: any[];
  meta?: Record<string, any>;
}

/**
 * Validate webhook signature
 */
function validateSignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('GHL_WEBHOOK_SECRET not configured - skipping signature validation');
    return true;
  }

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-ghl-signature') || '';

    // Validate signature
    if (!validateSignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: OutboundMessagePayload = JSON.parse(rawBody);

    console.log('Outbound message received:', {
      type: payload.type,
      locationId: payload.locationId,
      contactId: payload.contactId,
      conversationId: payload.conversationId,
      status: payload.status,
      messagePreview: payload.body?.substring(0, 50),
    });

    // Track outbound message for analytics/logging
    // This is useful for:
    // 1. Tracking message delivery status
    // 2. Logging AI responses
    // 3. Analytics and reporting

    // TODO: Store outbound message in database for tracking
    // await storeOutboundMessage(payload);

    return NextResponse.json({
      success: true,
      received: true,
      messageId: payload.messageId,
      status: payload.status,
    });

  } catch (err) {
    console.error('Webhook processing error:', err);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Also handle GET for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'outbound-message-webhook',
    timestamp: new Date().toISOString(),
  });
}
