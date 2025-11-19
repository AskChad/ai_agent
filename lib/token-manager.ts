/**
 * Token Manager Integration
 *
 * Handles encryption/decryption of sensitive tokens using the Token Manager service.
 * This ensures tokens are NEVER stored in plaintext in the database.
 *
 * Attack Kit Section 3: Token Manager Integration
 * Attack Kit Section 21: Token Storage Security
 */

import { config } from './config'
import { logger } from './logger'

interface EncryptResponse {
  success: boolean
  referenceId: string
  error?: string
}

interface DecryptResponse {
  success: boolean
  value: string
  error?: string
}

/**
 * Encrypt a token value using Token Manager
 * Returns a reference ID that can be safely stored in the database
 */
export async function encryptToken(
  service: string,
  userId: string,
  value: string
): Promise<string> {
  try {
    const response = await fetch(`${config.tokenManager.url}/tokens/encrypt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.tokenManager.apiKey}`,
      },
      body: JSON.stringify({
        service,
        userId,
        value,
      }),
    })

    if (!response.ok) {
      throw new Error(`Token encryption failed: ${response.statusText}`)
    }

    const data: EncryptResponse = await response.json()

    if (!data.success || !data.referenceId) {
      throw new Error(data.error || 'Token encryption failed')
    }

    logger.debug('Token encrypted successfully', {
      service,
      userId,
      referenceId: data.referenceId.substring(0, 8) + '...',
    })

    return data.referenceId
  } catch (error) {
    logger.error('Token encryption error', {
      service,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Decrypt a token reference using Token Manager
 * Returns the original plaintext value
 */
export async function decryptToken(referenceId: string): Promise<string> {
  try {
    const response = await fetch(`${config.tokenManager.url}/tokens/decrypt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.tokenManager.apiKey}`,
      },
      body: JSON.stringify({
        referenceId,
      }),
    })

    if (!response.ok) {
      throw new Error(`Token decryption failed: ${response.statusText}`)
    }

    const data: DecryptResponse = await response.json()

    if (!data.success || !data.value) {
      throw new Error(data.error || 'Token decryption failed')
    }

    logger.debug('Token decrypted successfully', {
      referenceId: referenceId.substring(0, 8) + '...',
    })

    return data.value
  } catch (error) {
    logger.error('Token decryption error', {
      referenceId: referenceId.substring(0, 8) + '...',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Delete a token from Token Manager
 * Should be called when revoking OAuth tokens
 */
export async function deleteToken(referenceId: string): Promise<void> {
  try {
    const response = await fetch(`${config.tokenManager.url}/tokens/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.tokenManager.apiKey}`,
      },
      body: JSON.stringify({
        referenceId,
      }),
    })

    if (!response.ok) {
      throw new Error(`Token deletion failed: ${response.statusText}`)
    }

    logger.debug('Token deleted successfully', {
      referenceId: referenceId.substring(0, 8) + '...',
    })
  } catch (error) {
    logger.error('Token deletion error', {
      referenceId: referenceId.substring(0, 8) + '...',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    // Don't throw - deletion failure shouldn't block revocation
  }
}

/**
 * Check if Token Manager is configured and available
 */
export function isTokenManagerConfigured(): boolean {
  return !!(config.tokenManager.url && config.tokenManager.apiKey)
}

/**
 * Validate Token Manager configuration
 * Throws error if not properly configured
 */
export function validateTokenManagerConfig(): void {
  if (!config.tokenManager.url) {
    throw new Error(
      'TOKEN_MANAGER_URL environment variable is not set. ' +
        'Token Manager is required for secure token storage.'
    )
  }

  if (!config.tokenManager.apiKey) {
    throw new Error(
      'TOKEN_MANAGER_API_KEY environment variable is not set. ' +
        'Token Manager is required for secure token storage.'
    )
  }
}
