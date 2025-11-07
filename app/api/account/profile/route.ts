import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/account/profile - Get current user's account information
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Supabase
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    // Fetch account details from database
    const client = await db.getClient();
    try {
      const result = await client.query(
        `SELECT id, account_name, ghl_location_id, is_active, created_at
         FROM accounts
         WHERE id = $1`,
        [user.id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Account not found'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        account: result.rows[0],
        user: {
          id: user.id,
          email: user.email
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching account profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
