/**
 * GHL Inbound Message Webhook Handler
 * Receives incoming messages from GoHighLevel and triggers AI response
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAccessToken } from '@/lib/ghl/client';

// Webhook secret for signature validation
const WEBHOOK_SECRET = process.env.GHL_WEBHOOK_SECRET || '';

interface InboundMessagePayload {
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
  attachments?: any[];
  meta?: Record<string, any>;
}

/**
 * Validate webhook signature
 */
function validateSignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('GHL_WEBHOOK_SECRET not configured - skipping signature validation');
    return true; // Skip validation if not configured (development only)
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

    const payload: InboundMessagePayload = JSON.parse(rawBody);

    console.log('Inbound message received:', {
      type: payload.type,
      locationId: payload.locationId,
      contactId: payload.contactId,
      conversationId: payload.conversationId,
      messagePreview: payload.body?.substring(0, 50),
    });

    // Only process inbound messages (from contacts, not from users)
    if (payload.direction !== 'inbound') {
      return NextResponse.json({ success: true, skipped: true, reason: 'Not an inbound message' });
    }

    // Get access token for this location
    let accessToken: string;
    try {
      accessToken = await getAccessToken(payload.locationId);
    } catch (err) {
      console.error('Failed to get access token:', err);
      return NextResponse.json({
        error: 'Location not connected',
        locationId: payload.locationId
      }, { status: 400 });
    }

    // TODO: Process message with AI and send response
    // This is where you would:
    // 1. Look up contact context
    // 2. Retrieve conversation history
    // 3. Generate AI response
    // 4. Send response via GHL API

    // For now, just log and acknowledge
    console.log('Message ready for AI processing:', {
      locationId: payload.locationId,
      conversationId: payload.conversationId,
      message: payload.body,
    });

    // Placeholder: Send response via GHL API
    // const response = await sendMessage(accessToken, payload.conversationId, aiResponse);

    return NextResponse.json({
      success: true,
      received: true,
      locationId: payload.locationId,
      conversationId: payload.conversationId,
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
    endpoint: 'inbound-message-webhook',
    timestamp: new Date().toISOString(),
  });
}
