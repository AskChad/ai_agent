import { getAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * GHL Inbound Message Webhook Handler
 * Receives messages FROM contacts TO GHL (customer sends a message)
 * This triggers AI response generation
 */

// Webhook payload schema
const inboundMessageSchema = z.object({
  type: z.enum(['SMS', 'Email', 'WhatsApp', 'GMB', 'FB', 'Instagram', 'Custom']),
  contactId: z.string(),
  locationId: z.string(),
  messageId: z.string(),
  conversationId: z.string().optional(),
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
  conversationProviderId: z.string().optional(),
});

type InboundMessage = z.infer<typeof inboundMessageSchema>;

export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();

    console.log('📥 Received GHL INBOUND webhook:', JSON.stringify(body, null, 2));

    // Validate webhook payload
    const validation = inboundMessageSchema.safeParse(body);
    if (!validation.success) {
      console.error('Invalid webhook payload:', validation.error);
      return NextResponse.json(
        { error: 'Invalid payload', details: validation.error.errors },
        { status: 400 }
      );
    }

    const message = validation.data;

    // Find account by GHL location ID
    const { data: account, error: accountError } = await supabase
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

    // Extract message content based on type
    const content = extractMessageContent(message);
    const contactInfo = extractContactInfo(message);

    // Find or create conversation
    let conversation: any = await findOrCreateConversation(
      supabase,
      account!.id,
      message.contactId,
      message.conversationId,
      contactInfo,
      message.type
    );

    // Store the INBOUND message from contact
    const { data: storedMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        account_id: account!.id,
        role: 'user',
        content,
        direction: 'inbound',       // FROM contact TO GHL
        source: 'contact',           // Source is the contact
        ghl_message_id: message.messageId,
        channel: message.type.toLowerCase(),
        metadata: {
          type: message.type,
          attachments: message.attachments || [],
          conversationId: message.conversationId,
          raw: message,
        },
      })
      .select()
      .single();

    if (messageError) {
      console.error('Failed to store message:', messageError);
      return NextResponse.json(
        { error: 'Failed to store message' },
        { status: 500 }
      );
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation.id);

    console.log('✅ Inbound message stored:', storedMessage.id);

    // TODO: Trigger AI response generation
    // This will:
    // 1. Load conversation context
    // 2. Generate AI response
    // 3. Store AI message with direction='outbound', source='ai_agent'
    // 4. Send via GHL API
    //
    // await processInboundMessage(conversation.id, storedMessage.id);

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      messageId: storedMessage.id,
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
 * Find existing conversation or create new one
 */
async function findOrCreateConversation(
  supabase: any,
  accountId: string,
  ghlContactId: string,
  ghlConversationId: string | undefined,
  contactInfo: any,
  channel: string
): Promise<any> {
  // Try to find by GHL conversation ID first
  if (ghlConversationId) {
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('*')
      .eq('ghl_conversation_id', ghlConversationId)
      .eq('account_id', accountId)
      .maybeSingle();

    if (existingConv) return existingConv;
  }

  // Try to find by contact ID
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('*')
    .eq('ghl_contact_id', ghlContactId)
    .eq('account_id', accountId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingConv) return existingConv;

  // Create new conversation
  const { data: newConv, error: convError } = await supabase
    .from('conversations')
    .insert({
      account_id: accountId,
      ghl_contact_id: ghlContactId,
      ghl_conversation_id: ghlConversationId,
      contact_name: contactInfo.name || 'Unknown Contact',
      contact_phone: contactInfo.phone,
      contact_email: contactInfo.email,
      channel: channel.toLowerCase(),
      is_active: true,
    })
    .select()
    .single();

  if (convError) {
    throw new Error(`Failed to create conversation: ${convError.message}`);
  }

  return newConv;
}

/**
 * Extract message content from different channel types
 */
function extractMessageContent(message: InboundMessage): string {
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

/**
 * Extract contact information from message
 */
function extractContactInfo(message: InboundMessage): {
  name?: string;
  phone?: string;
  email?: string;
} {
  const info: any = {};

  if (message.phone) {
    info.phone = message.phone;
  }

  if (message.emailFrom?.email) {
    info.email = message.emailFrom.email;
    info.name = message.emailFrom.name;
  }

  return info;
}

// Allow POST without authentication for webhooks
export const dynamic = 'force-dynamic';
