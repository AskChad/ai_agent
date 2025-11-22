import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Disconnect GoHighLevel integration for a specific agent
 * Query params:
 * DELETE /api/ghl/disconnect?agentId=xxx
 */
// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get agentId from query params
    const agentId = request.nextUrl.searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    // Verify the agent belongs to this user
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the GHL session for this agent
    const { error: deleteError } = await supabase
      .from('ghl_sessions')
      .delete()
      .eq('agent_id', agentId);

    if (deleteError) {
      console.error('Error deleting GHL session:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect from GHL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully disconnected agent "${agent.name}" from GoHighLevel`,
      agentId,
    });

  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

// Also support POST for backwards compatibility
export async function POST(request: NextRequest) {
  return DELETE(request);
}
