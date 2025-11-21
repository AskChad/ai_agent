/**
 * Account Settings Database Operations
 *
 * CRUD operations for account_settings table.
 * Manages AI behavior configuration per account.
 */

import { createClient } from '@/lib/supabase/server'
import type { AccountSettings } from '@/lib/supabase/types'
import { logger } from '@/lib/logger'
import { NotFoundError, DatabaseError } from '@/lib/errors'

/**
 * Default account settings
 */
export const DEFAULT_ACCOUNT_SETTINGS = {
  // Context window settings
  context_window_days: 30,
  context_window_messages: 60,
  max_context_tokens: 8000,

  // Semantic search settings
  enable_semantic_search: true,
  semantic_search_limit: 10,
  semantic_similarity_threshold: 0.7,

  // RAG settings
  enable_rag: true,
  rag_chunk_limit: 5,
  rag_similarity_threshold: 0.75,

  // AI Provider settings
  default_ai_provider: 'openai' as const,
  openai_model: 'gpt-4-turbo-preview',
  anthropic_model: 'claude-3-5-sonnet-20241022',

  // Function calling settings
  enable_function_calling: true,
  max_function_calls_per_message: 10,
}

/**
 * Get account settings
 */
export async function getAccountSettings(
  accountId: string
): Promise<AccountSettings> {
  try {
    logger.debug('Fetching account settings', { accountId })

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('account_settings')
      .select('*')
      .eq('account_id', accountId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Account settings', accountId)
      }
      throw new DatabaseError('Failed to fetch account settings', error)
    }

    logger.debug('Account settings fetched successfully', { accountId })

    return data
  } catch (error) {
    logger.error('Failed to get account settings', error, { accountId })
    throw error
  }
}

/**
 * Get account settings or return defaults if not found
 */
export async function getAccountSettingsOrDefaults(
  accountId: string
): Promise<AccountSettings> {
  try {
    return await getAccountSettings(accountId)
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.debug('Settings not found, creating defaults', { accountId })
      return await createDefaultAccountSettings(accountId)
    }
    throw error
  }
}

/**
 * Create account settings with default values
 */
export async function createDefaultAccountSettings(
  accountId: string
): Promise<AccountSettings> {
  try {
    logger.info('Creating default account settings', { accountId })

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('account_settings')
      .insert({
        account_id: accountId,
        ...DEFAULT_ACCOUNT_SETTINGS,
      })
      .select()
      .single()

    if (error) {
      throw new DatabaseError('Failed to create account settings', error)
    }

    logger.info('Default account settings created', { accountId })

    return data
  } catch (error) {
    logger.error('Failed to create default account settings', error, {
      accountId,
    })
    throw error
  }
}

/**
 * Update account settings
 */
export async function updateAccountSettings(
  accountId: string,
  updates: Partial<Omit<AccountSettings, 'id' | 'account_id' | 'created_at' | 'updated_at'>>
): Promise<AccountSettings> {
  try {
    logger.info('Updating account settings', { accountId, updates })

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('account_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Account settings', accountId)
      }
      throw new DatabaseError('Failed to update account settings', error)
    }

    logger.info('Account settings updated successfully', { accountId })

    return data
  } catch (error) {
    logger.error('Failed to update account settings', error, { accountId })
    throw error
  }
}

/**
 * Reset account settings to defaults
 */
export async function resetAccountSettings(
  accountId: string
): Promise<AccountSettings> {
  try {
    logger.info('Resetting account settings to defaults', { accountId })

    return await updateAccountSettings(accountId, DEFAULT_ACCOUNT_SETTINGS)
  } catch (error) {
    logger.error('Failed to reset account settings', error, { accountId })
    throw error
  }
}

/**
 * Delete account settings
 */
export async function deleteAccountSettings(accountId: string): Promise<void> {
  try {
    logger.warn('Deleting account settings', { accountId })

    const supabase = await createClient()

    const { error } = await supabase
      .from('account_settings')
      .delete()
      .eq('account_id', accountId)

    if (error) {
      throw new DatabaseError('Failed to delete account settings', error)
    }

    logger.warn('Account settings deleted', { accountId })
  } catch (error) {
    logger.error('Failed to delete account settings', error, { accountId })
    throw error
  }
}

/**
 * Validate settings values
 */
export function validateAccountSettings(
  settings: Partial<AccountSettings>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Context window validation
  if (
    settings.context_window_days !== undefined &&
    (settings.context_window_days < 1 || settings.context_window_days > 365)
  ) {
    errors.push('context_window_days must be between 1 and 365')
  }

  if (
    settings.context_window_messages !== undefined &&
    (settings.context_window_messages < 1 ||
      settings.context_window_messages > 500)
  ) {
    errors.push('context_window_messages must be between 1 and 500')
  }

  if (
    settings.max_context_tokens !== undefined &&
    (settings.max_context_tokens < 100 || settings.max_context_tokens > 128000)
  ) {
    errors.push('max_context_tokens must be between 100 and 128000')
  }

  // Semantic search validation
  if (
    settings.semantic_search_limit !== undefined &&
    (settings.semantic_search_limit < 1 ||
      settings.semantic_search_limit > 50)
  ) {
    errors.push('semantic_search_limit must be between 1 and 50')
  }

  if (
    settings.semantic_similarity_threshold !== undefined &&
    (settings.semantic_similarity_threshold < 0 ||
      settings.semantic_similarity_threshold > 1)
  ) {
    errors.push('semantic_similarity_threshold must be between 0 and 1')
  }

  // RAG validation
  if (
    settings.rag_chunk_limit !== undefined &&
    (settings.rag_chunk_limit < 1 || settings.rag_chunk_limit > 20)
  ) {
    errors.push('rag_chunk_limit must be between 1 and 20')
  }

  if (
    settings.rag_similarity_threshold !== undefined &&
    (settings.rag_similarity_threshold < 0 ||
      settings.rag_similarity_threshold > 1)
  ) {
    errors.push('rag_similarity_threshold must be between 0 and 1')
  }

  // Function calling validation
  if (
    settings.max_function_calls_per_message !== undefined &&
    (settings.max_function_calls_per_message < 1 ||
      settings.max_function_calls_per_message > 20)
  ) {
    errors.push('max_function_calls_per_message must be between 1 and 20')
  }

  // AI provider validation
  if (
    settings.default_ai_provider !== undefined &&
    !['openai', 'anthropic'].includes(settings.default_ai_provider)
  ) {
    errors.push('default_ai_provider must be "openai" or "anthropic"')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get context window size (in days or messages, whichever is larger)
 */
export function getContextWindowSize(settings: AccountSettings): {
  days: number
  messages: number
  effectiveLimit: 'days' | 'messages'
} {
  const { context_window_days, context_window_messages } = settings

  // Use whichever gives us more context
  const effectiveLimit =
    context_window_days > context_window_messages / 10 ? 'days' : 'messages'

  return {
    days: context_window_days,
    messages: context_window_messages,
    effectiveLimit,
  }
}
