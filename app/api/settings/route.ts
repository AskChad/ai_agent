import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getAccountSettingsOrDefaults,
  updateAccountSettings,
  resetAccountSettings,
  validateAccountSettings,
} from '@/lib/db/account-settings';
import { successResponse, errorResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings
 * Get current account settings
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', null, 401);
    }

    // Get account settings
    const settings = await getAccountSettingsOrDefaults(user.id);

    return successResponse(settings);
  } catch (error) {
    logger.error('Failed to get settings', error);
    return errorResponse(
      'SETTINGS_FETCH_FAILED',
      'Failed to fetch settings',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}

/**
 * PATCH /api/settings
 * Update account settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', null, 401);
    }

    // Parse request body
    const updates = await request.json();

    // Validate settings
    const validation = validateAccountSettings(updates);
    if (!validation.valid) {
      return errorResponse(
        'VALIDATION_FAILED',
        'Invalid settings values',
        validation.errors.join(', '),
        400
      );
    }

    // Update settings
    const settings = await updateAccountSettings(user.id, updates);

    logger.info('Account settings updated', { userId: user.id, updates });

    return successResponse(settings);
  } catch (error) {
    logger.error('Failed to update settings', error);
    return errorResponse(
      'SETTINGS_UPDATE_FAILED',
      'Failed to update settings',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}

/**
 * POST /api/settings/reset
 * Reset settings to defaults
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', null, 401);
    }

    // Reset settings
    const settings = await resetAccountSettings(user.id);

    logger.info('Account settings reset to defaults', { userId: user.id });

    return successResponse(settings);
  } catch (error) {
    logger.error('Failed to reset settings', error);
    return errorResponse(
      'SETTINGS_RESET_FAILED',
      'Failed to reset settings',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
