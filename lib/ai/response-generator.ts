/**
 * AI Response Generator
 *
 * Handles automatic AI response generation for inbound messages.
 * This module:
 * 1. Loads conversation context
 * 2. Generates AI response using OpenAI
 * 3. Stores the AI message in database
 * 4. Sends the response via GHL API
 */

import { getAdminClient } from '@/lib/supabase/admin'
import { openai } from './openai-client'
import { loadConversationContext, formatMessagesForAI } from '@/lib/db/context-loader'
import { sendInboundMessage, type GHLMessage } from '@/lib/ghl/messaging'
import { logger } from '@/lib/logger'
import { config } from '@/lib/config'

interface GenerateResponseOptions {
  conversationId: string
  accountId: string
  contactId: string
  contactName?: string
  channel: string
}

/**
 * Process an inbound message and generate an AI response
 */
export async function processInboundMessage(
  conversationId: string,
  inboundMessageId: string
): Promise<{
  success: boolean
  aiMessageId?: string
  ghlMessageId?: string
  error?: string
}> {
  try {
    logger.info('Processing inbound message for AI response', {
      conversationId,
      inboundMessageId,
    })

    const supabase = getAdminClient()

    // Get the conversation and account details
    const { data: conversation, error: convError } = await (supabase as any)
      .from('conversations')
      .select(`
        *,
        account:accounts(*)
      `)
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      logger.error('Failed to load conversation', convError)
      return { success: false, error: 'Conversation not found' }
    }

    // Check if account has GHL connected
    if (!conversation.account.ghl_access_token) {
      logger.warn('Account does not have GHL connected, skipping AI response')
      return { success: false, error: 'GHL not connected' }
    }

    // Generate AI response
    const response = await generateAIResponse({
      conversationId: conversation.id,
      accountId: conversation.account.id,
      contactId: conversation.ghl_contact_id,
      contactName: conversation.contact_name,
      channel: conversation.channel,
    })

    if (!response.success || !response.content) {
      logger.error('Failed to generate AI response', { error: response.error })
      return { success: false, error: response.error }
    }

    // Store the AI message in database FIRST (before sending to GHL)
    // This allows the outbound webhook to detect it as ai_agent source
    const { data: aiMessage, error: messageError } = await (supabase as any)
      .from('messages')
      .insert({
        conversation_id: conversationId,
        account_id: conversation.account.id,
        role: 'assistant',
        content: response.content,
        direction: 'outbound',
        source: 'ai_agent',
        channel: conversation.channel,
        model_used: response.model,
        tokens_used: response.tokensUsed,
      })
      .select()
      .single()

    if (messageError) {
      logger.error('Failed to store AI message', messageError)
      return { success: false, error: 'Failed to store AI message' }
    }

    logger.info('AI message stored in database', {
      aiMessageId: aiMessage.id,
      conversationId,
    })

    // Send the AI response via GHL API
    try {
      const ghlMessage: GHLMessage = {
        type: mapChannelToGHLType(conversation.channel),
        contactId: conversation.ghl_contact_id,
        conversationId: conversation.ghl_conversation_id,
        conversationProviderId: config.ghl.conversationProviderId,
      }

      // Add message content based on type
      if (ghlMessage.type === 'Email') {
        ghlMessage.html = response.content
        ghlMessage.subject = 'Re: Your inquiry'
      } else {
        ghlMessage.message = response.content
      }

      const ghlResponse = await sendInboundMessage(
        conversation.account.ghl_access_token,
        config.ghl.conversationProviderId,
        ghlMessage
      )

      // Update our message with the GHL message ID
      await (supabase as any)
        .from('messages')
        .update({ ghl_message_id: ghlResponse.messageId })
        .eq('id', aiMessage.id)

      logger.info('AI response sent via GHL successfully', {
        aiMessageId: aiMessage.id,
        ghlMessageId: ghlResponse.messageId,
        conversationId,
      })

      return {
        success: true,
        aiMessageId: aiMessage.id,
        ghlMessageId: ghlResponse.messageId,
      }
    } catch (ghlError) {
      logger.error('Failed to send AI response via GHL', ghlError)
      // Message is stored in DB but not sent - mark as failed
      await (supabase as any)
        .from('messages')
        .update({
          precedes_user_reply: true // Mark as interrupted/unsent
        })
        .eq('id', aiMessage.id)

      return {
        success: false,
        error: 'Failed to send via GHL',
        aiMessageId: aiMessage.id
      }
    }
  } catch (error) {
    logger.error('Failed to process inbound message', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Generate AI response using conversation context
 */
async function generateAIResponse(
  options: GenerateResponseOptions
): Promise<{
  success: boolean
  content?: string
  model?: string
  tokensUsed?: number
  error?: string
}> {
  try {
    const { conversationId, accountId, contactName, channel } = options

    logger.debug('Generating AI response', { conversationId, accountId })

    // Load conversation context
    const context = await loadConversationContext(accountId, conversationId)

    if (context.messages.length === 0) {
      logger.warn('No messages in conversation context')
      return { success: false, error: 'No context available' }
    }

    // Format messages for OpenAI
    const messages = formatMessagesForAI(context.messages)

    // Add system prompt
    const systemPrompt = createSystemPrompt({
      contactName,
      channel,
      conversationStats: `${context.stats.returnedMessages} messages loaded`,
    })

    // Generate response using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.filter((m) => m.role !== 'function'), // OpenAI chat completion doesn't support function role
      ] as any,
      temperature: 0.7,
      max_tokens: 500,
    })

    const aiResponse = completion.choices[0]?.message?.content

    if (!aiResponse) {
      logger.error('No response from OpenAI')
      return { success: false, error: 'No response generated' }
    }

    logger.info('AI response generated successfully', {
      conversationId,
      responseLength: aiResponse.length,
      tokensUsed: completion.usage?.total_tokens,
    })

    return {
      success: true,
      content: aiResponse,
      model: completion.model,
      tokensUsed: completion.usage?.total_tokens,
    }
  } catch (error) {
    logger.error('Failed to generate AI response', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create system prompt for AI
 */
function createSystemPrompt(context: {
  contactName?: string
  channel?: string
  conversationStats?: string
}): string {
  let prompt = `You are a helpful AI assistant responding to customer inquiries.

Your role:
- Provide helpful, accurate, and friendly responses
- Keep responses concise and clear
- Use a professional but warm tone
- Ask clarifying questions when needed
- If you don't know something, admit it honestly`

  if (context.contactName) {
    prompt += `\n\nYou are chatting with: ${context.contactName}`
  }

  if (context.channel) {
    prompt += `\n\nCommunication channel: ${context.channel.toUpperCase()}`

    // Channel-specific guidance
    if (context.channel === 'sms') {
      prompt += '\nKeep responses brief - SMS has character limits'
    } else if (context.channel === 'email') {
      prompt += '\nYou can provide more detailed responses with proper formatting'
    }
  }

  if (context.conversationStats) {
    prompt += `\n\nConversation context: ${context.conversationStats}`
  }

  return prompt
}

/**
 * Map internal channel names to GHL message types
 */
function mapChannelToGHLType(channel: string): 'SMS' | 'Email' | 'Custom' {
  const channelLower = channel.toLowerCase()

  if (channelLower === 'sms' || channelLower === 'whatsapp') {
    return 'SMS'
  } else if (channelLower === 'email') {
    return 'Email'
  } else {
    return 'Custom'
  }
}
