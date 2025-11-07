import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { Agent, CreateAgentRequest } from '@/types/agent';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// GET /api/agents - List all agents for the authenticated account
export async function GET(request: NextRequest) {
  try {
    const accountId = request.headers.get('x-account-id');
    if (!accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query<Agent>(
        `SELECT * FROM agents
         WHERE account_id = $1
         ORDER BY is_default DESC, created_at DESC`,
        [accountId]
      );

      return NextResponse.json({ agents: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const accountId = request.headers.get('x-account-id');
    if (!accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateAgentRequest = await request.json();

    // Validate required fields
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Check agent limit
      const limitCheck = await client.query(
        `SELECT
          acc.max_agents,
          COUNT(a.id) FILTER (WHERE a.status != 'archived') as active_agents
         FROM accounts acc
         LEFT JOIN agents a ON a.account_id = acc.id
         WHERE acc.id = $1
         GROUP BY acc.max_agents`,
        [accountId]
      );

      if (limitCheck.rows.length > 0) {
        const { max_agents, active_agents } = limitCheck.rows[0];
        if (max_agents !== 0 && parseInt(active_agents) >= max_agents) {
          return NextResponse.json({
            error: `Agent limit reached. Maximum allowed: ${max_agents}`
          }, { status: 403 });
        }
      }

      // Create the agent
      const result = await client.query<Agent>(
        `INSERT INTO agents (
          account_id, name, description, ai_provider, ai_model,
          system_prompt, context_window, enable_function_calling
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          accountId,
          body.name.trim(),
          body.description || null,
          body.ai_provider || 'openai',
          body.ai_model || 'gpt-4',
          body.system_prompt || 'You are a helpful AI assistant.',
          body.context_window || 60,
          body.enable_function_calling ?? true
        ]
      );

      return NextResponse.json({ agent: result.rows[0] }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error creating agent:', error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json({
        error: 'An agent with this name already exists'
      }, { status: 409 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
