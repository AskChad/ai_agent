import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminInsert, adminInsertAndSelect } from '@/lib/supabase/admin';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/agents - List all agents for the authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agents:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      agents: agents || []
    });
  } catch (error: unknown) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Agent name is required'
      }, { status: 400 });
    }

    // Create the agent using admin client to bypass RLS
    const { data: agent, error } = await adminInsertAndSelect('agents', {
      user_id: user.id,
      name: body.name.trim(),
      description: body.description || null,
      ai_provider: body.ai_provider || 'openai',
      ai_model: body.ai_model || 'gpt-4',
      system_prompt: body.system_prompt || 'You are a helpful AI assistant.',
      context_window: body.context_window || 60,
      enable_function_calling: body.enable_function_calling ?? true,
      status: 'active',
      is_default: false,
    });

    if (error) {
      console.error('Error creating agent:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({
          success: false,
          error: 'An agent with this name already exists'
        }, { status: 409 });
      }

      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      agent
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating agent:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
