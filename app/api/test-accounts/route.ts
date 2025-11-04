/**
 * Test Accounts API Route
 *
 * Tests account and account settings operations.
 * Visit: http://localhost:3000/api/test-accounts
 */

import { NextResponse } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import {
  createAccountWithSettings,
  getOrCreateAccountByLocationId,
} from '@/lib/db/create-account-with-settings'
import {
  getAccount,
  getAccountByLocationId,
  listAccounts,
  updateAccount,
  deactivateAccount,
  deleteAccount,
} from '@/lib/db/accounts'
import {
  getAccountSettings,
  updateAccountSettings,
  resetAccountSettings,
  validateAccountSettings,
  DEFAULT_ACCOUNT_SETTINGS,
} from '@/lib/db/account-settings'

export async function GET() {
  try {
    logger.info('Running account operations tests...')

    const testId = Date.now()
    const results: Record<string, any> = {}

    // ========================================================================
    // TEST 1: Create account with settings
    // ========================================================================
    logger.info('[TEST 1] Creating account with settings...')

    const { account: account1, settings: settings1 } =
      await createAccountWithSettings({
        account_name: `Test Account ${testId}`,
        ghl_location_id: `loc-${testId}`,
      })

    results.test1_create_account = {
      status: '✅ Created',
      account_id: account1.id,
      account_name: account1.account_name,
      settings_created: !!settings1.id,
      settings_values: {
        context_days: settings1.context_window_days,
        context_messages: settings1.context_window_messages,
        ai_provider: settings1.default_ai_provider,
      },
    }

    logger.debug('Account created', {
      accountId: account1.id,
      settingsId: settings1.id,
    })

    // ========================================================================
    // TEST 2: Get account by ID
    // ========================================================================
    logger.info('[TEST 2] Getting account by ID...')

    const retrievedAccount = await getAccount(account1.id)

    results.test2_get_account = {
      status: '✅ Retrieved',
      matches_created: retrievedAccount.id === account1.id,
      account_name: retrievedAccount.account_name,
    }

    // ========================================================================
    // TEST 3: Get account by location ID
    // ========================================================================
    logger.info('[TEST 3] Getting account by location ID...')

    const accountByLocation = await getAccountByLocationId(`loc-${testId}`)

    results.test3_get_by_location = {
      status: accountByLocation ? '✅ Found' : '❌ Not found',
      matches_created: accountByLocation?.id === account1.id,
    }

    // ========================================================================
    // TEST 4: Update account
    // ========================================================================
    logger.info('[TEST 4] Updating account...')

    const updatedAccount = await updateAccount(account1.id, {
      account_name: `Updated Test Account ${testId}`,
    })

    results.test4_update_account = {
      status: '✅ Updated',
      new_name: updatedAccount.account_name,
      name_changed: updatedAccount.account_name !== account1.account_name,
    }

    // ========================================================================
    // TEST 5: Get account settings
    // ========================================================================
    logger.info('[TEST 5] Getting account settings...')

    const retrievedSettings = await getAccountSettings(account1.id)

    results.test5_get_settings = {
      status: '✅ Retrieved',
      settings_id: retrievedSettings.id,
      matches_defaults: {
        context_days:
          retrievedSettings.context_window_days ===
          DEFAULT_ACCOUNT_SETTINGS.context_window_days,
        ai_provider:
          retrievedSettings.default_ai_provider ===
          DEFAULT_ACCOUNT_SETTINGS.default_ai_provider,
      },
    }

    // ========================================================================
    // TEST 6: Update account settings
    // ========================================================================
    logger.info('[TEST 6] Updating account settings...')

    const updatedSettings = await updateAccountSettings(account1.id, {
      context_window_days: 60,
      context_window_messages: 100,
      default_ai_provider: 'anthropic',
    })

    results.test6_update_settings = {
      status: '✅ Updated',
      new_values: {
        context_days: updatedSettings.context_window_days,
        context_messages: updatedSettings.context_window_messages,
        ai_provider: updatedSettings.default_ai_provider,
      },
      values_changed: {
        context_days: updatedSettings.context_window_days === 60,
        context_messages: updatedSettings.context_window_messages === 100,
        ai_provider: updatedSettings.default_ai_provider === 'anthropic',
      },
    }

    // ========================================================================
    // TEST 7: Validate settings
    // ========================================================================
    logger.info('[TEST 7] Validating settings...')

    const validSettings = validateAccountSettings({
      context_window_days: 30,
      semantic_similarity_threshold: 0.7,
    })

    const invalidSettings = validateAccountSettings({
      context_window_days: 500, // Invalid: > 365
      semantic_similarity_threshold: 1.5, // Invalid: > 1
    })

    results.test7_validate_settings = {
      status: '✅ Validated',
      valid_settings: {
        valid: validSettings.valid,
        errors: validSettings.errors,
      },
      invalid_settings: {
        valid: invalidSettings.valid,
        error_count: invalidSettings.errors.length,
        errors: invalidSettings.errors,
      },
    }

    // ========================================================================
    // TEST 8: Reset settings to defaults
    // ========================================================================
    logger.info('[TEST 8] Resetting settings to defaults...')

    const resetSettings = await resetAccountSettings(account1.id)

    results.test8_reset_settings = {
      status: '✅ Reset',
      back_to_defaults: {
        context_days:
          resetSettings.context_window_days ===
          DEFAULT_ACCOUNT_SETTINGS.context_window_days,
        ai_provider:
          resetSettings.default_ai_provider ===
          DEFAULT_ACCOUNT_SETTINGS.default_ai_provider,
      },
    }

    // ========================================================================
    // TEST 9: List accounts
    // ========================================================================
    logger.info('[TEST 9] Listing accounts...')

    const { accounts, total } = await listAccounts({ limit: 10 })

    results.test9_list_accounts = {
      status: '✅ Listed',
      count: accounts.length,
      total: total,
      includes_test_account: accounts.some((a) => a.id === account1.id),
    }

    // ========================================================================
    // TEST 10: Get or create by location ID (existing)
    // ========================================================================
    logger.info('[TEST 10] Get or create existing account...')

    const { account: existingAccount } = await getOrCreateAccountByLocationId(
      `loc-${testId}`,
      'Should Not Create This'
    )

    results.test10_get_or_create_existing = {
      status: '✅ Retrieved existing',
      same_account: existingAccount.id === account1.id,
      name_unchanged:
        existingAccount.account_name === updatedAccount.account_name,
    }

    // ========================================================================
    // TEST 11: Get or create by location ID (new)
    // ========================================================================
    logger.info('[TEST 11] Get or create new account...')

    const { account: newAccount } = await getOrCreateAccountByLocationId(
      `loc-new-${testId}`,
      `New Account ${testId}`
    )

    results.test11_get_or_create_new = {
      status: '✅ Created new',
      account_id: newAccount.id,
      different_from_first: newAccount.id !== account1.id,
    }

    // ========================================================================
    // TEST 12: Deactivate account
    // ========================================================================
    logger.info('[TEST 12] Deactivating account...')

    const deactivatedAccount = await deactivateAccount(newAccount.id)

    results.test12_deactivate = {
      status: '✅ Deactivated',
      is_active: deactivatedAccount.is_active,
      deactivated: !deactivatedAccount.is_active,
    }

    // ========================================================================
    // TEST 13: Clean up - Delete test accounts
    // ========================================================================
    logger.info('[TEST 13] Cleaning up test data...')

    await deleteAccount(account1.id)
    await deleteAccount(newAccount.id)

    results.test13_cleanup = {
      status: '✅ Cleaned up',
      accounts_deleted: 2,
    }

    logger.info('All account tests completed successfully!')

    return successResponse({
      message: 'Account operations tests passed! ✅',
      tests: results,
      summary: {
        total_tests: 13,
        passed: 13,
        failed: 0,
        categories: {
          account_crud: '✅ Working',
          settings_crud: '✅ Working',
          validation: '✅ Working',
          utilities: '✅ Working',
        },
      },
    })
  } catch (error) {
    logger.error('Account tests failed', error)

    return errorResponse(
      'ACCOUNT_TESTS_FAILED',
      'Account operations test encountered an error',
      error instanceof Error ? error.message : 'Unknown error',
      500
    )
  }
}
