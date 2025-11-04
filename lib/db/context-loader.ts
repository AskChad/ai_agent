/**
 * Context Loader
 *
 * Smart context loading for AI conversations.
 * Loads messages based on account settings (days, message count, tokens).
 */

import type { Message, AccountSettings } from '@/lib/supabase/types'
import { logger } from '@/lib/logger'
import {
  getRecentMessages,
  getMessagesSinceDays,
  searchMessages,
} from './messages'
import { getAccountSettings } from './account-settings'

/**
 * Estimate token count for a message
 * Rule of thumb: ~4 characters = 1 token
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Estimate tokens for multiple messages
 */
export function estimateMessagesTokens(messages: Message[]): number {
  return messages.reduce(
    (total, msg) => total + estimateTokens(msg.content),
    0
  )
}

/**
 * Load conversation context based on account settings
 */
export async function loadConversationContext(
  accountId: string,
  conversationId: string,
  options?: {
    maxTokens?: number
    maxMessages?: number
    maxDays?: number
  }
): Promise<{
  messages: Message[]
  totalTokens: number
  truncated: boolean
  stats: {
    requestedMessages: number
    returnedMessages: number
    daysLoaded: number
  }
}> {
  try {
    logger.debug('Loading conversation context', {
      accountId,
      conversationId,
      options,
    })

    // Get account settings if custom options not provided
    const settings = await getAccountSettings(accountId)

    const maxTokens = options?.maxTokens || settings.max_context_tokens
    const maxMessages = options?.maxMessages || settings.context_window_messages
    const maxDays = options?.maxDays || settings.context_window_days

    logger.debug('Context limits', { maxTokens, maxMessages, maxDays })

    // Load messages from last N days OR last N messages (whichever gives more)
    const messagesByDays = await getMessagesSinceDays(conversationId, maxDays)
    const messagesByCount = await getRecentMessages(conversationId, maxMessages)

    // Use whichever set is larger
    const candidateMessages =
      messagesByDays.length > messagesByCount.length
        ? messagesByDays
        : messagesByCount

    logger.debug('Candidate messages loaded', {
      byDays: messagesByDays.length,
      byCount: messagesByCount.length,
      selected: candidateMessages.length,
    })

    // Trim to fit within token limit
    const { messages, totalTokens, truncated } = trimMessagesToTokenLimit(
      candidateMessages,
      maxTokens
    )

    logger.info('Conversation context loaded', {
      messagesReturned: messages.length,
      totalTokens,
      truncated,
      conversationId,
    })

    return {
      messages,
      totalTokens,
      truncated,
      stats: {
        requestedMessages: maxMessages,
        returnedMessages: messages.length,
        daysLoaded: maxDays,
      },
    }
  } catch (error) {
    logger.error('Failed to load conversation context', error, {
      accountId,
      conversationId,
    })
    throw error
  }
}

/**
 * Trim messages to fit within token limit
 * Keeps most recent messages
 */
export function trimMessagesToTokenLimit(
  messages: Message[],
  maxTokens: number
): {
  messages: Message[]
  totalTokens: number
  truncated: boolean
} {
  if (messages.length === 0) {
    return { messages: [], totalTokens: 0, truncated: false }
  }

  // Start from most recent and work backwards
  const reversedMessages = [...messages].reverse()
  const selectedMessages: Message[] = []
  let totalTokens = 0
  let truncated = false

  for (const message of reversedMessages) {
    const messageTokens = estimateTokens(message.content)

    if (totalTokens + messageTokens <= maxTokens) {
      selectedMessages.unshift(message) // Add to beginning to maintain order
      totalTokens += messageTokens
    } else {
      truncated = true
      break
    }
  }

  // If we couldn't fit any messages, at least return the most recent one (truncated)
  if (selectedMessages.length === 0 && messages.length > 0) {
    const lastMessage = messages[messages.length - 1]
    const truncatedContent = lastMessage.content.substring(0, maxTokens * 4) // ~4 chars per token
    selectedMessages.push({
      ...lastMessage,
      content: truncatedContent + '... [truncated]',
    })
    totalTokens = maxTokens
    truncated = true
  }

  return {
    messages: selectedMessages,
    totalTokens,
    truncated,
  }
}

/**
 * Load conversation context with semantic search
 * Combines recent messages + semantically similar messages
 */
export async function loadContextWithSemanticSearch(
  accountId: string,
  conversationId: string,
  userQuery: string,
  options?: {
    maxTokens?: number
    recentMessagesCount?: number
    semanticResultsCount?: number
    similarityThreshold?: number
  }
): Promise<{
  recentMessages: Message[]
  semanticMessages: Message[]
  totalTokens: number
  truncated: boolean
}> {
  try {
    logger.debug('Loading context with semantic search', {
      accountId,
      conversationId,
      query: userQuery.substring(0, 50),
    })

    const settings = await getAccountSettings(accountId)

    const maxTokens = options?.maxTokens || settings.max_context_tokens
    const recentCount =
      options?.recentMessagesCount || Math.floor(settings.context_window_messages / 2)
    const semanticCount =
      options?.semanticResultsCount || settings.semantic_search_limit
    const threshold =
      options?.similarityThreshold || settings.semantic_similarity_threshold

    // Load recent messages
    const recentMessages = await getRecentMessages(conversationId, recentCount)

    // Load semantically similar messages (if enabled)
    let semanticMessages: Message[] = []
    if (settings.enable_semantic_search) {
      semanticMessages = await searchMessages(conversationId, userQuery, {
        limit: semanticCount,
        similarityThreshold: threshold,
      })

      // Remove duplicates (messages that appear in both recent and semantic)
      const recentIds = new Set(recentMessages.map((m) => m.id))
      semanticMessages = semanticMessages.filter((m) => !recentIds.has(m.id))
    }

    // Combine and trim to token limit
    const allMessages = [...recentMessages, ...semanticMessages]
    const { messages: trimmedMessages, totalTokens, truncated } =
      trimMessagesToTokenLimit(allMessages, maxTokens)

    // Separate back into recent and semantic for return
    const recentIds = new Set(recentMessages.map((m) => m.id))
    const finalRecent = trimmedMessages.filter((m) => recentIds.has(m.id))
    const finalSemantic = trimmedMessages.filter((m) => !recentIds.has(m.id))

    logger.info('Context with semantic search loaded', {
      recentCount: finalRecent.length,
      semanticCount: finalSemantic.length,
      totalTokens,
      truncated,
    })

    return {
      recentMessages: finalRecent,
      semanticMessages: finalSemantic,
      totalTokens,
      truncated,
    }
  } catch (error) {
    logger.error('Failed to load context with semantic search', error, {
      accountId,
      conversationId,
    })
    throw error
  }
}

/**
 * Format messages for AI API
 * Converts database messages to OpenAI/Anthropic format
 */
export function formatMessagesForAI(
  messages: Message[]
): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))
}

/**
 * Calculate context window stats
 */
export function calculateContextStats(messages: Message[]): {
  totalMessages: number
  userMessages: number
  assistantMessages: number
  systemMessages: number
  totalTokens: number
  averageTokensPerMessage: number
  oldestMessage: string | null
  newestMessage: string | null
} {
  const userMessages = messages.filter((m) => m.role === 'user').length
  const assistantMessages = messages.filter((m) => m.role === 'assistant').length
  const systemMessages = messages.filter((m) => m.role === 'system').length
  const totalTokens = estimateMessagesTokens(messages)

  return {
    totalMessages: messages.length,
    userMessages,
    assistantMessages,
    systemMessages,
    totalTokens,
    averageTokensPerMessage:
      messages.length > 0 ? Math.round(totalTokens / messages.length) : 0,
    oldestMessage: messages.length > 0 ? messages[0].created_at : null,
    newestMessage:
      messages.length > 0 ? messages[messages.length - 1].created_at : null,
  }
}

/**
 * Prepare system message with context
 * Useful for providing instructions to the AI
 */
export function createSystemMessage(
  instructions: string,
  contextInfo?: {
    contactName?: string
    conversationStats?: string
    relevantInfo?: string
  }
): Message {
  let content = instructions

  if (contextInfo) {
    if (contextInfo.contactName) {
      content += `\n\nYou are chatting with: ${contextInfo.contactName}`
    }

    if (contextInfo.conversationStats) {
      content += `\n\nConversation stats: ${contextInfo.conversationStats}`
    }

    if (contextInfo.relevantInfo) {
      content += `\n\nRelevant information: ${contextInfo.relevantInfo}`
    }
  }

  return {
    id: 'system-' + Date.now(),
    conversation_id: '',
    role: 'system',
    content,
    precedes_user_reply: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ghl_message_id: null,
    metadata: null,
    embedding: null,
  }
}
