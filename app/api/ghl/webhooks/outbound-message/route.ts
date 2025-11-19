import { getAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * GHL Outbound Message Webhook Handler
 * Receives messages FROM GHL TO contacts (message sent out from GHL)
 *
 * This webhook fires when:
 * 1. Our AI agent sends a message (via GHL API)
 * 2. A GHL user sends a manual message
 * 3. A GHL automation/workflow sends a message
 *
 * We parse the payload to determine the source and store appropriately
 */

// Webhook payload schema
const outboundMessageSchema = z.object({
  type: z.enum(['SMS', 'Email', 'WhatsApp', 'GMB', 'FB', 'Instagram', 'Custom']),
  contactId: z.string(),
  locationId: z.string(),
  messageId: z.string(),
  userId: z.string().optional(),  // KEY: Present if sent by GHL user manually
  attachments: z.array(z.string()).optional(),

  // SMS/WhatsApp fields
  phone: z.string().optional(),
  message: z.string().optional(),
  body: z.string().optional(),

  // Email fields
  emailTo: z.array(z.string()).optional(),
  emailFrom: z.object({
    email: z.string(),
    name: z.string().optional(),
  }).optional(),
  subject: z.string().optional(),
  html: z.string().optional(),

  // Social media fields
  contentType: z.string().optional(),

  // Conversation tracking
  conversationId: z.string().optional(),
  conversationProviderId: z.string().optional(),
});

type OutboundMessage = z.infer<typeof outboundMessageSchema>;

export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();

    console.log('📤 Received GHL OUTBOUND webhook:', JSON.stringify(body, null, 2));

    // Validate webhook payload
    const validation = outboundMessageSchema.safeParse(body);
    if (!validation.success) {
      console.error('Invalid webhook payload:', validation.error);
      return NextResponse.json(
        { error: 'Invalid payload', details: validation.error.errors },
        { status: 400 }
      );
    }

    const message = validation.data;

    // Find account by GHL location ID
    const { data: account, error: accountError } = await (supabase as any)
      .from('accounts')
      .select('id, account_name')
      .eq('ghl_location_id', message.locationId)
      .single();

    if (accountError || !account) {
      console.error('Account not found for location:', message.locationId);
      return NextResponse.json(
        { error: 'Account not configured for this location' },
        { status: 404 }
      );
    }

    // Extract message content
    const content = extractMessageContent(message);

    // Find conversation (should already exist)
    const { data: conversation } = await (supabase as any)
      .from('conversations')
      .select('*')
      .eq('ghl_contact_id', message.contactId)
      .eq('account_id', account.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conversation) {
      console.warn('No conversation found for outbound message, creating one');
      // Create conversation if it doesn't exist
      const { data: newConv, error: convError } = await (supabase as any)
        .from('conversations')
        .insert({
          account_id: account.id,
          ghl_contact_id: message.contactId,
          ghl_conversation_id: message.conversationId,
          contact_name: 'Unknown Contact',
          channel: message.type.toLowerCase(),
          is_active: true,
        })
        .select()
        .single();

      if (convError) {
        console.error('Failed to create conversation:', convError);
        return NextResponse.json(
          { error: 'Failed to create conversation' },
          { status: 500 }
        );
      }

      // Use new conversation
      const conversationId = newConv.id;

      // Store message as unknown source initially
      await storeOutboundMessage(
        supabase,
        conversationId,
        account.id,
        message,
        content,
        'system', // Default to system if no conversation context
        'system'
      );

      return NextResponse.json({
        success: true,
        conversationId,
        source: 'system',
      });
    }

    // SMART SOURCE DETECTION
    const { source, role } = await determineMessageSource(
      supabase,
      message,
      account.id,
      conversation.id
    );

    console.log(`📊 Classified outbound message as: ${source} (role: ${role})`);

    // Store the outbound message with proper classification
    const { data: storedMessage, error: messageError } = await storeOutboundMessage(
      supabase,
      conversation.id,
      account.id,
      message,
      content,
      source,
      role
    );

    if (messageError) {
      console.error('Failed to store message:', messageError);
      return NextResponse.json(
        { error: 'Failed to store message' },
        { status: 500 }
      );
    }

    // Update conversation timestamp
    await (supabase as any)
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation.id);

    console.log(`✅ Outbound message stored: ${storedMessage.id} (${source})`);

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      messageId: storedMessage.id,
      source: source,
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * SMART SOURCE DETECTION
 * Determine who sent this outbound message by analyzing the payload and database
 */
async function determineMessageSource(
  supabase: any,
  message: OutboundMessage,
  accountId: string,
  conversationId: string
): Promise<{ source: 'ai_agent' | 'ghl_user' | 'ghl_automation', role: string }> {

  // STEP 1: Check if this message already exists in our database
  // If we already stored it with role='assistant', it means OUR AI sent it
  const { data: existingMessage } = await (supabase as any)
    .from('messages')
    .select('id, role, source')
    .eq('conversation_id', conversationId)
    .eq('ghl_message_id', message.messageId)
    .maybeSingle();

  if (existingMessage && existingMessage.role === 'assistant') {
    console.log('🤖 Message already in DB with role=assistant → AI Agent sent this');
    return {
      source: 'ai_agent',
      role: 'assistant'
    };
  }

  // STEP 2: Check if userId is present
  // If userId exists, a GHL user sent this manually
  if (message.userId) {
    console.log(`👤 userId present (${message.userId}) → GHL User sent this manually`);
    return {
      source: 'ghl_user',
      role: 'user'  // Human agent response
    };
  }

  // STEP 3: No userId and not in our DB
  // This means a GHL automation/workflow sent it
  console.log('🔄 No userId, not in DB → GHL Automation sent this');
  return {
    source: 'ghl_automation',
    role: 'system'  // Automated system message
  };
}

/**
 * Store outbound message with proper classification
 */
async function storeOutboundMessage(
  supabase: any,
  conversationId: string,
  accountId: string,
  message: OutboundMessage,
  content: string,
  source: 'ai_agent' | 'ghl_user' | 'ghl_automation' | 'system',
  role: string
) {
  return await (supabase as any)
    .from('messages')
    .insert({
      conversation_id: conversationId,
      account_id: accountId,
      role: role,
      content: content,
      direction: 'outbound',      // FROM GHL TO contact
      source: source,             // Who sent it: ai_agent, ghl_user, or ghl_automation
      ghl_message_id: message.messageId,
      channel: message.type.toLowerCase(),
      metadata: {
        type: message.type,
        userId: message.userId,
        attachments: message.attachments || [],
        conversationId: message.conversationId,
        raw: message,
      },
    })
    .select()
    .single();
}

/**
 * Extract message content from different channel types
 */
function extractMessageContent(message: OutboundMessage): string {
  switch (message.type) {
    case 'SMS':
    case 'WhatsApp':
      return message.message || message.body || '';

    case 'Email':
      return message.html || message.body || '';

    case 'GMB':
    case 'FB':
    case 'Instagram':
      return message.body || message.message || '';

    default:
      return message.message || message.body || message.html || '';
  }
}

// Allow POST without authentication for webhooks
export const dynamic = 'force-dynamic';
