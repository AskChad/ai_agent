import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { Agent, UpdateAgentRequest } from '@/types/agent';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// GET /api/agents/[id] - Get a specific agent
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
      const result = await client.query<Agent>(
        `SELECT * FROM agents WHERE id = $1 AND account_id = $2`,
        [params.id, accountId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      return NextResponse.json({ agent: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching agent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/agents/[id] - Update an agent
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountId = request.headers.get('x-account-id');
    if (!accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateAgentRequest = await request.json();

    const client = await pool.connect();
    try {
      // Verify agent belongs to account
      const existing = await client.query(
        'SELECT id FROM agents WHERE id = $1 AND account_id = $2',
        [params.id, accountId]
      );

      if (existing.rows.length === 0) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [params.id, accountId];
      let paramCount = 2;

      if (body.name !== undefined) {
        updates.push(`name = $${++paramCount}`);
        values.push(body.name.trim());
      }
      if (body.description !== undefined) {
        updates.push(`description = $${++paramCount}`);
        values.push(body.description);
      }
      if (body.ai_provider !== undefined) {
        updates.push(`ai_provider = $${++paramCount}`);
        values.push(body.ai_provider);
      }
      if (body.ai_model !== undefined) {
        updates.push(`ai_model = $${++paramCount}`);
        values.push(body.ai_model);
      }
      if (body.system_prompt !== undefined) {
        updates.push(`system_prompt = $${++paramCount}`);
        values.push(body.system_prompt);
      }
      if (body.context_window !== undefined) {
        updates.push(`context_window = $${++paramCount}`);
        values.push(body.context_window);
      }
      if (body.enable_function_calling !== undefined) {
        updates.push(`enable_function_calling = $${++paramCount}`);
        values.push(body.enable_function_calling);
      }
      if (body.status !== undefined) {
        updates.push(`status = $${++paramCount}`);
        values.push(body.status);
      }
      if (body.is_default !== undefined) {
        updates.push(`is_default = $${++paramCount}`);
        values.push(body.is_default);
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      // If setting as default, unset other defaults first
      if (body.is_default === true) {
        await client.query(
          'UPDATE agents SET is_default = FALSE WHERE account_id = $1 AND id != $2',
          [accountId, params.id]
        );
      }

      const result = await client.query<Agent>(
        `UPDATE agents
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $1 AND account_id = $2
         RETURNING *`,
        values
      );

      return NextResponse.json({ agent: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error updating agent:', error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json({
        error: 'An agent with this name already exists'
      }, { status: 409 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/agents/[id] - Delete an agent
export async function DELETE(
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
      // Check if this is the default agent
      const agent = await client.query(
        'SELECT is_default FROM agents WHERE id = $1 AND account_id = $2',
        [params.id, accountId]
      );

      if (agent.rows.length === 0) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      // Prevent deletion of default agent if it's the only one
      if (agent.rows[0].is_default) {
        const count = await client.query(
          'SELECT COUNT(*) FROM agents WHERE account_id = $1 AND status != $2',
          [accountId, 'archived']
        );

        if (parseInt(count.rows[0].count) <= 1) {
          return NextResponse.json({
            error: 'Cannot delete the only active agent. Create another agent first.'
          }, { status: 400 });
        }
      }

      // Archive instead of delete to preserve data integrity
      await client.query(
        `UPDATE agents
         SET status = 'archived', updated_at = NOW()
         WHERE id = $1 AND account_id = $2`,
        [params.id, accountId]
      );

      // If this was the default agent, set another agent as default
      if (agent.rows[0].is_default) {
        await client.query(
          `UPDATE agents
           SET is_default = TRUE
           WHERE account_id = $1 AND status = 'active'
           ORDER BY created_at ASC
           LIMIT 1`,
          [accountId]
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error deleting agent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
