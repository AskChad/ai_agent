/**
 * Create Account with Settings
 *
 * Utility to create an account and its default settings in a transaction-like operation.
 * This is the recommended way to create new accounts.
 */

import { createAccount } from './accounts'
import { createDefaultAccountSettings } from './account-settings'
import type { Account, AccountSettings } from '@/lib/supabase/types'
import { logger } from '@/lib/logger'

export interface CreateAccountResult {
  account: Account
  settings: AccountSettings
}

/**
 * Create account with default settings
 *
 * This is the recommended way to create a new account.
 * It ensures that settings are always created alongside the account.
 */
export async function createAccountWithSettings(input: {
  account_name: string
  ghl_location_id?: string
}): Promise<CreateAccountResult> {
  try {
    logger.info('Creating account with settings', {
      accountName: input.account_name,
      locationId: input.ghl_location_id,
    })

    // Step 1: Create account
    const account = await createAccount({
      account_name: input.account_name,
      ghl_location_id: input.ghl_location_id,
    })

    logger.debug('Account created, creating settings...', {
      accountId: account.id,
    })

    // Step 2: Create default settings
    let settings: AccountSettings

    try {
      settings = await createDefaultAccountSettings(account.id)
    } catch (error) {
      // If settings creation fails, we should probably delete the account
      // to maintain consistency
      logger.error(
        'Failed to create settings, cleaning up account',
        error,
        { accountId: account.id }
      )

      // Clean up the account
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      await supabase.from('accounts').delete().eq('id', account.id)

      throw error
    }

    logger.info('Account with settings created successfully', {
      accountId: account.id,
      settingsId: settings.id,
    })

    return {
      account,
      settings,
    }
  } catch (error) {
    logger.error('Failed to create account with settings', error, {
      accountName: input.account_name,
    })
    throw error
  }
}

/**
 * Get or create account by GHL location ID
 *
 * Useful for OAuth callbacks where we want to get existing account
 * or create new one if it doesn't exist.
 */
export async function getOrCreateAccountByLocationId(
  locationId: string,
  accountName: string
): Promise<CreateAccountResult> {
  try {
    logger.debug('Getting or creating account by location ID', {
      locationId,
      accountName,
    })

    const { getAccountByLocationId } = await import('./accounts')
    const { getAccountSettings } = await import('./account-settings')

    // Try to get existing account
    const existingAccount = await getAccountByLocationId(locationId)

    if (existingAccount) {
      logger.debug('Account already exists', {
        accountId: existingAccount.id,
        locationId,
      })

      // Get settings (or create if missing)
      const { getAccountSettingsOrDefaults } = await import(
        './account-settings'
      )
      const settings = await getAccountSettingsOrDefaults(existingAccount.id)

      return {
        account: existingAccount,
        settings,
      }
    }

    // Account doesn't exist, create new one
    logger.debug('Account does not exist, creating new one', {
      locationId,
      accountName,
    })

    return await createAccountWithSettings({
      account_name: accountName,
      ghl_location_id: locationId,
    })
  } catch (error) {
    logger.error('Failed to get or create account by location ID', error, {
      locationId,
      accountName,
    })
    throw error
  }
}
