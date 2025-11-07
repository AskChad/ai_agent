import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// PATCH /api/admin/accounts/[id]/agent-limit - Update agent limit for an account
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountId = request.headers.get('x-account-id');
    if (!accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin status
    const client = await pool.connect();
    try {
      const adminCheck = await client.query(
        'SELECT is_platform_admin FROM accounts WHERE id = $1',
        [accountId]
      );

      if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_platform_admin) {
        return NextResponse.json({
          error: 'Forbidden. Platform admin access required.'
        }, { status: 403 });
      }

      const body = await request.json();
      const { max_agents } = body;

      if (typeof max_agents !== 'number' || max_agents < 0) {
        return NextResponse.json({
          error: 'max_agents must be a number >= 0 (0 = unlimited)'
        }, { status: 400 });
      }

      // Update the account's agent limit
      const result = await client.query(
        `UPDATE accounts
         SET max_agents = $1
         WHERE id = $2
         RETURNING id, email, max_agents`,
        [max_agents, params.id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        account: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error updating agent limit:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/admin/accounts/[id]/agent-limit - Get account's agent usage
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountId = request.headers.get('x-account-id');
    if (!accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Verify admin status
      const adminCheck = await client.query(
        'SELECT is_platform_admin FROM accounts WHERE id = $1',
        [accountId]
      );

      if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_platform_admin) {
        return NextResponse.json({
          error: 'Forbidden. Platform admin access required.'
        }, { status: 403 });
      }

      // Get account usage
      const result = await client.query(
        `SELECT * FROM account_agent_usage WHERE account_id = $1`,
        [params.id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      return NextResponse.json({ usage: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching agent usage:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
