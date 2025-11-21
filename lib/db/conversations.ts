/**
 * Conversation Database Operations
 *
 * CRUD operations for the conversations table.
 * Handles conversation creation, retrieval, updates, and archival.
 */

import { createClient } from '@/lib/supabase/server'
import type { Conversation } from '@/lib/supabase/types'
import { logger } from '@/lib/logger'
import { NotFoundError, DatabaseError } from '@/lib/errors'

/**
 * Get conversation by ID
 */
export async function getConversation(
  conversationId: string
): Promise<Conversation> {
  try {
    logger.debug('Fetching conversation', { conversationId })

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Conversation', conversationId)
      }
      throw new DatabaseError('Failed to fetch conversation', error)
    }

    logger.debug('Conversation fetched successfully', { conversationId })

    return data
  } catch (error) {
    logger.error('Failed to get conversation', error, { conversationId })
    throw error
  }
}

/**
 * Get conversation by GHL contact ID
 */
export async function getConversationByContactId(
  accountId: string,
  ghlContactId: string
): Promise<Conversation | null> {
  try {
    logger.debug('Fetching conversation by contact ID', {
      accountId,
      ghlContactId,
    })

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('account_id', accountId)
      .eq('ghl_contact_id', ghlContactId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      throw new DatabaseError(
        'Failed to fetch conversation by contact ID',
        error
      )
    }

    if (data) {
      logger.debug('Conversation found', {
        conversationId: data.id,
        ghlContactId,
      })
    } else {
      logger.debug('No active conversation found for contact', {
        ghlContactId,
      })
    }

    return data
  } catch (error) {
    logger.error('Failed to get conversation by contact ID', error, {
      accountId,
      ghlContactId,
    })
    throw error
  }
}

/**
 * List conversations for an account
 */
export async function listConversations(
  accountId: string,
  options?: {
    isActive?: boolean
    limit?: number
    offset?: number
    sortBy?: 'created_at' | 'updated_at' | 'last_message_at'
    sortOrder?: 'asc' | 'desc'
  }
): Promise<{ conversations: Conversation[]; total: number }> {
  try {
    const {
      isActive,
      limit = 50,
      offset = 0,
      sortBy = 'last_message_at',
      sortOrder = 'desc',
    } = options || {}

    logger.debug('Listing conversations', {
      accountId,
      isActive,
      limit,
      offset,
      sortBy,
    })

    const supabase = await createClient()

    let query = supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('account_id', accountId)

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive)
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new DatabaseError('Failed to list conversations', error)
    }

    logger.debug('Conversations listed successfully', {
      count: data?.length || 0,
      total: count || 0,
    })

    return {
      conversations: data || [],
      total: count || 0,
    }
  } catch (error) {
    logger.error('Failed to list conversations', error, { accountId })
    throw error
  }
}

/**
 * Create new conversation
 */
export async function createConversation(input: {
  account_id: string
  ghl_contact_id: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  metadata?: Record<string, any>
}): Promise<Conversation> {
  try {
    logger.info('Creating conversation', {
      accountId: input.account_id,
      ghlContactId: input.ghl_contact_id,
    })

    const supabase = await createClient()

    // Check if active conversation already exists
    const existing = await getConversationByContactId(
      input.account_id,
      input.ghl_contact_id
    )

    if (existing) {
      logger.debug('Active conversation already exists', {
        conversationId: existing.id,
      })
      return existing
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        account_id: input.account_id,
        ghl_contact_id: input.ghl_contact_id,
        contact_name: input.contact_name || null,
        contact_email: input.contact_email || null,
        contact_phone: input.contact_phone || null,
        metadata: input.metadata || null,
        is_active: true,
        message_count: 0,
      })
      .select()
      .single()

    if (error) {
      throw new DatabaseError('Failed to create conversation', error)
    }

    logger.info('Conversation created successfully', {
      conversationId: data.id,
      accountId: input.account_id,
    })

    return data
  } catch (error) {
    logger.error('Failed to create conversation', error, {
      accountId: input.account_id,
    })
    throw error
  }
}

/**
 * Update conversation
 */
export async function updateConversation(
  conversationId: string,
  updates: {
    contact_name?: string
    contact_email?: string
    contact_phone?: string
    metadata?: Record<string, any>
  }
): Promise<Conversation> {
  try {
    logger.info('Updating conversation', { conversationId, updates })

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Conversation', conversationId)
      }
      throw new DatabaseError('Failed to update conversation', error)
    }

    logger.info('Conversation updated successfully', { conversationId })

    return data
  } catch (error) {
    logger.error('Failed to update conversation', error, { conversationId })
    throw error
  }
}

/**
 * Archive conversation (sets is_active to false)
 */
export async function archiveConversation(
  conversationId: string
): Promise<Conversation> {
  try {
    logger.info('Archiving conversation', { conversationId })

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('conversations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Conversation', conversationId)
      }
      throw new DatabaseError('Failed to archive conversation', error)
    }

    logger.info('Conversation archived successfully', { conversationId })

    return data
  } catch (error) {
    logger.error('Failed to archive conversation', error, { conversationId })
    throw error
  }
}

/**
 * Unarchive conversation (sets is_active to true)
 */
export async function unarchiveConversation(
  conversationId: string
): Promise<Conversation> {
  try {
    logger.info('Unarchiving conversation', { conversationId })

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('conversations')
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Conversation', conversationId)
      }
      throw new DatabaseError('Failed to unarchive conversation', error)
    }

    logger.info('Conversation unarchived successfully', { conversationId })

    return data
  } catch (error) {
    logger.error('Failed to unarchive conversation', error, { conversationId })
    throw error
  }
}

/**
 * Delete conversation permanently
 * WARNING: This will cascade delete all messages!
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    logger.warn('HARD DELETE: Permanently deleting conversation', {
      conversationId,
    })

    const supabase = await createClient()

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)

    if (error) {
      throw new DatabaseError('Failed to delete conversation', error)
    }

    logger.warn('Conversation permanently deleted', { conversationId })
  } catch (error) {
    logger.error('Failed to delete conversation', error, { conversationId })
    throw error
  }
}

/**
 * Get or create conversation by contact ID
 * Useful for webhook handlers
 */
export async function getOrCreateConversation(
  accountId: string,
  ghlContactId: string,
  contactInfo?: {
    name?: string
    email?: string
    phone?: string
  }
): Promise<Conversation> {
  try {
    logger.debug('Getting or creating conversation', {
      accountId,
      ghlContactId,
    })

    // Try to get existing conversation
    const existing = await getConversationByContactId(accountId, ghlContactId)

    if (existing) {
      logger.debug('Conversation already exists', {
        conversationId: existing.id,
      })
      return existing
    }

    // Create new conversation
    logger.debug('Conversation does not exist, creating new one', {
      accountId,
      ghlContactId,
    })

    return await createConversation({
      account_id: accountId,
      ghl_contact_id: ghlContactId,
      contact_name: contactInfo?.name,
      contact_email: contactInfo?.email,
      contact_phone: contactInfo?.phone,
    })
  } catch (error) {
    logger.error('Failed to get or create conversation', error, {
      accountId,
      ghlContactId,
    })
    throw error
  }
}

/**
 * Get conversation statistics
 */
export async function getConversationStats(
  conversationId: string
): Promise<{
  messageCount: number
  lastMessageAt: string | null
  firstMessageAt: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('message_count, last_message_at, created_at')
      .eq('id', conversationId)
      .single()

    if (error) {
      throw new DatabaseError('Failed to get conversation stats', error)
    }

    return {
      messageCount: conversation.message_count,
      lastMessageAt: conversation.last_message_at,
      firstMessageAt: conversation.created_at,
    }
  } catch (error) {
    logger.error('Failed to get conversation stats', error, { conversationId })
    throw error
  }
}
