/**
 * Account Database Operations
 *
 * CRUD operations for the accounts table.
 * Handles account creation, retrieval, updates, and deletion.
 */

import { createClient } from '@/lib/supabase/server'
import type { Account } from '@/lib/supabase/types'
import { logger } from '@/lib/logger'
import { NotFoundError, DatabaseError, ConflictError } from '@/lib/errors'

/**
 * Get account by ID
 */
export async function getAccount(accountId: string): Promise<Account> {
  try {
    logger.debug('Fetching account', { accountId })

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Account', accountId)
      }
      throw new DatabaseError('Failed to fetch account', error)
    }

    logger.debug('Account fetched successfully', { accountId })

    return data
  } catch (error) {
    logger.error('Failed to get account', error, { accountId })
    throw error
  }
}

/**
 * Get account by GHL location ID
 */
export async function getAccountByLocationId(
  locationId: string
): Promise<Account | null> {
  try {
    logger.debug('Fetching account by location ID', { locationId })

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('ghl_location_id', locationId)
      .maybeSingle()

    if (error) {
      throw new DatabaseError('Failed to fetch account by location ID', error)
    }

    if (data) {
      logger.debug('Account found', { accountId: data.id, locationId })
    } else {
      logger.debug('No account found for location ID', { locationId })
    }

    return data
  } catch (error) {
    logger.error('Failed to get account by location ID', error, { locationId })
    throw error
  }
}

/**
 * List all accounts
 */
export async function listAccounts(options?: {
  isActive?: boolean
  limit?: number
  offset?: number
}): Promise<{ accounts: Account[]; total: number }> {
  try {
    const { isActive, limit = 50, offset = 0 } = options || {}

    logger.debug('Listing accounts', { isActive, limit, offset })

    const supabase = await createClient()

    let query = supabase.from('accounts').select('*', { count: 'exact' })

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive)
    }

    query = query.order('created_at', { ascending: false })
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new DatabaseError('Failed to list accounts', error)
    }

    logger.debug('Accounts listed successfully', {
      count: data?.length || 0,
      total: count || 0,
    })

    return {
      accounts: data || [],
      total: count || 0,
    }
  } catch (error) {
    logger.error('Failed to list accounts', error)
    throw error
  }
}

/**
 * Create new account
 */
export async function createAccount(input: {
  account_name: string
  ghl_location_id?: string
}): Promise<Account> {
  try {
    logger.info('Creating account', {
      accountName: input.account_name,
      locationId: input.ghl_location_id,
    })

    const supabase = await createClient()

    // Check if location ID already exists
    if (input.ghl_location_id) {
      const existing = await getAccountByLocationId(input.ghl_location_id)
      if (existing) {
        throw new ConflictError(
          `Account already exists for location ID: ${input.ghl_location_id}`
        )
      }
    }

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        account_name: input.account_name,
        ghl_location_id: input.ghl_location_id || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      throw new DatabaseError('Failed to create account', error)
    }

    logger.info('Account created successfully', {
      accountId: data.id,
      accountName: data.account_name,
    })

    return data
  } catch (error) {
    logger.error('Failed to create account', error, {
      accountName: input.account_name,
    })
    throw error
  }
}

/**
 * Update account
 */
export async function updateAccount(
  accountId: string,
  updates: {
    account_name?: string
    ghl_location_id?: string
    is_active?: boolean
  }
): Promise<Account> {
  try {
    logger.info('Updating account', { accountId, updates })

    const supabase = await createClient()

    // Check if location ID is being changed and if it conflicts
    if (updates.ghl_location_id) {
      const existing = await getAccountByLocationId(updates.ghl_location_id)
      if (existing && existing.id !== accountId) {
        throw new ConflictError(
          `Location ID already in use by another account: ${existing.id}`
        )
      }
    }

    const { data, error } = await supabase
      .from('accounts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Account', accountId)
      }
      throw new DatabaseError('Failed to update account', error)
    }

    logger.info('Account updated successfully', { accountId })

    return data
  } catch (error) {
    logger.error('Failed to update account', error, { accountId })
    throw error
  }
}

/**
 * Delete account (soft delete - set is_active = false)
 */
export async function deactivateAccount(accountId: string): Promise<Account> {
  try {
    logger.info('Deactivating account', { accountId })

    return await updateAccount(accountId, { is_active: false })
  } catch (error) {
    logger.error('Failed to deactivate account', error, { accountId })
    throw error
  }
}

/**
 * Delete account permanently (hard delete)
 * WARNING: This will cascade delete all related data!
 */
export async function deleteAccount(accountId: string): Promise<void> {
  try {
    logger.warn('HARD DELETE: Permanently deleting account', { accountId })

    const supabase = await createClient()

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId)

    if (error) {
      throw new DatabaseError('Failed to delete account', error)
    }

    logger.warn('Account permanently deleted', { accountId })
  } catch (error) {
    logger.error('Failed to delete account', error, { accountId })
    throw error
  }
}

/**
 * Check if account exists
 */
export async function accountExists(accountId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .maybeSingle()

    if (error) {
      throw new DatabaseError('Failed to check account existence', error)
    }

    return !!data
  } catch (error) {
    logger.error('Failed to check account existence', error, { accountId })
    throw error
  }
}
