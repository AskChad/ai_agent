import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/agents/[id] - Get a specific agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .eq('account_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching agent:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    if (!agent) {
      return NextResponse.json({
        success: false,
        error: 'Agent not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      agent
    });
  } catch (error: unknown) {
    console.error('Error fetching agent:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PATCH /api/agents/[id] - Update an agent
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const body = await request.json();

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description;
    if (body.ai_provider !== undefined) updates.ai_provider = body.ai_provider;
    if (body.ai_model !== undefined) updates.ai_model = body.ai_model;
    if (body.system_prompt !== undefined) updates.system_prompt = body.system_prompt;
    if (body.context_window !== undefined) updates.context_window = body.context_window;
    if (body.enable_function_calling !== undefined) updates.enable_function_calling = body.enable_function_calling;
    if (body.status !== undefined) updates.status = body.status;
    if (body.is_default !== undefined) updates.is_default = body.is_default;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No fields to update'
      }, { status: 400 });
    }

    // Add updated_at
    updates.updated_at = new Date().toISOString();

    // If setting as default, unset other defaults first
    if (body.is_default === true) {
      await supabase
        .from('agents')
        .update({ is_default: false })
        .eq('account_id', user.id)
        .neq('id', id);
    }

    const { data: agent, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id)
      .eq('account_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating agent:', error);

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
    });
  } catch (error: unknown) {
    console.error('Error updating agent:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/agents/[id] - Delete an agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    // Get the agent to check if it's default
    const { data: agent, error: fetchError } = await supabase
      .from('agents')
      .select('is_default')
      .eq('id', id)
      .eq('account_id', user.id)
      .maybeSingle();

    if (fetchError || !agent) {
      return NextResponse.json({
        success: false,
        error: 'Agent not found'
      }, { status: 404 });
    }

    // Prevent deletion of default agent if it's the only one
    if (agent.is_default) {
      const { count } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', user.id)
        .neq('status', 'archived');

      if (count && count <= 1) {
        return NextResponse.json({
          success: false,
          error: 'Cannot delete the only active agent. Create another agent first.'
        }, { status: 400 });
      }
    }

    // Archive instead of hard delete
    const { error: deleteError } = await supabase
      .from('agents')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('account_id', user.id);

    if (deleteError) {
      console.error('Error deleting agent:', deleteError);
      return NextResponse.json({
        success: false,
        error: deleteError.message
      }, { status: 500 });
    }

    // If this was the default agent, set another agent as default
    if (agent.is_default) {
      const { data: newDefault } = await supabase
        .from('agents')
        .select('id')
        .eq('account_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (newDefault) {
        await supabase
          .from('agents')
          .update({ is_default: true })
          .eq('id', newDefault.id);
      }
    }

    return NextResponse.json({
      success: true
    });
  } catch (error: unknown) {
    console.error('Error deleting agent:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
