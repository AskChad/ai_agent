/**
 * Message Database Operations
 *
 * CRUD operations for the messages table.
 * Handles message creation, retrieval, and smart context loading.
 */

import { createClient } from '@/lib/supabase/server'
import type { Message } from '@/lib/supabase/types'
import { logger } from '@/lib/logger'
import { NotFoundError, DatabaseError } from '@/lib/errors'
import { createEmbedding } from '@/lib/ai/embeddings'

/**
 * Get message by ID
 */
export async function getMessage(messageId: string): Promise<Message> {
  try {
    logger.debug('Fetching message', { messageId })

    const supabase = createClient()

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Message', messageId)
      }
      throw new DatabaseError('Failed to fetch message', error)
    }

    logger.debug('Message fetched successfully', { messageId })

    return data
  } catch (error) {
    logger.error('Failed to get message', error, { messageId })
    throw error
  }
}

/**
 * Create new message with embedding
 */
export async function createMessage(input: {
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  ghl_message_id?: string
  metadata?: Record<string, any>
  precedes_user_reply?: boolean
}): Promise<Message> {
  try {
    logger.info('Creating message', {
      conversationId: input.conversation_id,
      role: input.role,
      contentLength: input.content.length,
    })

    const supabase = createClient()

    // Generate embedding for the message
    let embedding: number[] | null = null
    try {
      embedding = await createEmbedding(input.content)
      logger.debug('Embedding generated', {
        dimensions: embedding.length,
        conversationId: input.conversation_id,
      })
    } catch (error) {
      logger.warn('Failed to generate embedding, continuing without it', {
        error: error instanceof Error ? error.message : String(error),
      })
      // Continue without embedding - not critical for message creation
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: input.conversation_id,
        role: input.role,
        content: input.content,
        ghl_message_id: input.ghl_message_id || null,
        metadata: input.metadata || null,
        precedes_user_reply: input.precedes_user_reply ?? false,
        embedding: embedding,
      })
      .select()
      .single()

    if (error) {
      throw new DatabaseError('Failed to create message', error)
    }

    logger.info('Message created successfully', {
      messageId: data.id,
      conversationId: input.conversation_id,
    })

    return data
  } catch (error) {
    logger.error('Failed to create message', error, {
      conversationId: input.conversation_id,
    })
    throw error
  }
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  options?: {
    limit?: number
    offset?: number
    sortOrder?: 'asc' | 'desc'
    roles?: ('user' | 'assistant' | 'system')[]
    excludePrecedesUserReply?: boolean
  }
): Promise<{ messages: Message[]; total: number }> {
  try {
    const {
      limit = 100,
      offset = 0,
      sortOrder = 'asc',
      roles,
      excludePrecedesUserReply = false,
    } = options || {}

    logger.debug('Fetching messages', {
      conversationId,
      limit,
      offset,
      sortOrder,
      roles,
      excludePrecedesUserReply,
    })

    const supabase = createClient()

    let query = supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('conversation_id', conversationId)

    if (roles && roles.length > 0) {
      query = query.in('role', roles)
    }

    if (excludePrecedesUserReply) {
      query = query.eq('precedes_user_reply', false)
    }

    query = query.order('created_at', { ascending: sortOrder === 'asc' })
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new DatabaseError('Failed to fetch messages', error)
    }

    logger.debug('Messages fetched successfully', {
      count: data?.length || 0,
      total: count || 0,
    })

    return {
      messages: data || [],
      total: count || 0,
    }
  } catch (error) {
    logger.error('Failed to get messages', error, { conversationId })
    throw error
  }
}

/**
 * Get recent messages for context loading
 * Automatically excludes messages that precede user replies
 */
export async function getRecentMessages(
  conversationId: string,
  limit: number = 20
): Promise<Message[]> {
  try {
    logger.debug('Fetching recent messages for context', {
      conversationId,
      limit,
    })

    const { messages } = await getMessages(conversationId, {
      limit,
      sortOrder: 'desc', // Get most recent first
      excludePrecedesUserReply: true, // Exclude interrupted AI messages
    })

    // Reverse to get chronological order
    const chronologicalMessages = messages.reverse()

    logger.debug('Recent messages loaded', {
      count: chronologicalMessages.length,
      conversationId,
    })

    return chronologicalMessages
  } catch (error) {
    logger.error('Failed to get recent messages', error, { conversationId })
    throw error
  }
}

/**
 * Get messages from the last N days
 */
export async function getMessagesSinceDays(
  conversationId: string,
  days: number
): Promise<Message[]> {
  try {
    logger.debug('Fetching messages from last N days', {
      conversationId,
      days,
    })

    const supabase = createClient()

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('precedes_user_reply', false) // Exclude interrupted messages
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      throw new DatabaseError('Failed to fetch messages since days', error)
    }

    logger.debug('Messages loaded', {
      count: data?.length || 0,
      days,
      conversationId,
    })

    return data || []
  } catch (error) {
    logger.error('Failed to get messages since days', error, {
      conversationId,
      days,
    })
    throw error
  }
}

/**
 * Search messages semantically using vector similarity
 */
export async function searchMessages(
  conversationId: string,
  query: string,
  options?: {
    limit?: number
    similarityThreshold?: number
  }
): Promise<Message[]> {
  try {
    const { limit = 10, similarityThreshold = 0.7 } = options || {}

    logger.debug('Searching messages semantically', {
      conversationId,
      query: query.substring(0, 50),
      limit,
      similarityThreshold,
    })

    // Generate embedding for the query
    const queryEmbedding = await createEmbedding(query)

    const supabase = createClient()

    // Use the search_conversation_history function
    const { data, error } = await supabase.rpc('search_conversation_history', {
      p_conversation_id: conversationId,
      p_query_embedding: queryEmbedding,
      p_similarity_threshold: similarityThreshold,
      p_limit: limit,
    })

    if (error) {
      throw new DatabaseError('Failed to search messages', error)
    }

    logger.debug('Semantic search completed', {
      resultsCount: data?.length || 0,
      conversationId,
    })

    return data || []
  } catch (error) {
    logger.error('Failed to search messages', error, { conversationId })
    throw error
  }
}

/**
 * Update message
 * Note: Typically you don't update messages, but this is here for completeness
 */
export async function updateMessage(
  messageId: string,
  updates: {
    content?: string
    metadata?: Record<string, any>
  }
): Promise<Message> {
  try {
    logger.info('Updating message', { messageId, updates })

    const supabase = createClient()

    // If content is being updated, regenerate embedding
    let embedding: number[] | undefined = undefined
    if (updates.content) {
      try {
        embedding = await createEmbedding(updates.content)
        logger.debug('New embedding generated for updated content')
      } catch (error) {
        logger.warn('Failed to generate new embedding', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const updateData: {
      content?: string
      metadata?: Record<string, any>
      updated_at: string
      embedding?: number[]
    } = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    if (embedding) {
      updateData.embedding = embedding
    }

    const { data, error } = await supabase
      .from('messages')
      .update(updateData)
      .eq('id', messageId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Message', messageId)
      }
      throw new DatabaseError('Failed to update message', error)
    }

    logger.info('Message updated successfully', { messageId })

    return data
  } catch (error) {
    logger.error('Failed to update message', error, { messageId })
    throw error
  }
}

/**
 * Delete message permanently
 */
export async function deleteMessage(messageId: string): Promise<void> {
  try {
    logger.warn('HARD DELETE: Permanently deleting message', { messageId })

    const supabase = createClient()

    const { error } = await supabase.from('messages').delete().eq('id', messageId)

    if (error) {
      throw new DatabaseError('Failed to delete message', error)
    }

    logger.warn('Message permanently deleted', { messageId })
  } catch (error) {
    logger.error('Failed to delete message', error, { messageId })
    throw error
  }
}

/**
 * Count messages in a conversation
 */
export async function countMessages(
  conversationId: string,
  options?: {
    roles?: ('user' | 'assistant' | 'system')[]
    excludePrecedesUserReply?: boolean
  }
): Promise<number> {
  try {
    const { roles, excludePrecedesUserReply = false } = options || {}

    const supabase = createClient()

    let query = supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)

    if (roles && roles.length > 0) {
      query = query.in('role', roles)
    }

    if (excludePrecedesUserReply) {
      query = query.eq('precedes_user_reply', false)
    }

    const { count, error } = await query

    if (error) {
      throw new DatabaseError('Failed to count messages', error)
    }

    return count || 0
  } catch (error) {
    logger.error('Failed to count messages', error, { conversationId })
    throw error
  }
}

/**
 * Get last message in conversation
 */
export async function getLastMessage(
  conversationId: string
): Promise<Message | null> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new DatabaseError('Failed to get last message', error)
    }

    return data
  } catch (error) {
    logger.error('Failed to get last message', error, { conversationId })
    throw error
  }
}

/**
 * Get last user message in conversation
 */
export async function getLastUserMessage(
  conversationId: string
): Promise<Message | null> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new DatabaseError('Failed to get last user message', error)
    }

    return data
  } catch (error) {
    logger.error('Failed to get last user message', error, { conversationId })
    throw error
  }
}
