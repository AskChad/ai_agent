import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Check GoHighLevel connection status for a specific agent
 * Query params:
 * GET /api/ghl/status?agentId=xxx
 */
// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
      .eq('account_id', user.id)
      .maybeSingle();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found or access denied' },
        { status: 404 }
      );
    }

    // Check ghl_sessions table for this agent
    const { data: session, error: sessionError } = await supabase
      .from('ghl_sessions')
      .select('location_id, company_id, expires_at, scope, user_type')
      .eq('agent_id', agentId)
      .maybeSingle();

    if (sessionError) {
      console.error('Error checking GHL session:', sessionError);
      return NextResponse.json({
        connected: false,
        agentId,
        agentName: agent.name,
        locationId: null,
      });
    }

    if (!session) {
      return NextResponse.json({
        connected: false,
        agentId,
        agentName: agent.name,
        locationId: null,
      });
    }

    // Check if token is expired
    const expiresAt = new Date(session.expires_at);
    const isExpired = expiresAt.getTime() < Date.now();

    return NextResponse.json({
      connected: !isExpired,
      agentId,
      agentName: agent.name,
      locationId: session.location_id,
      companyId: session.company_id,
      expiresAt: session.expires_at,
      scopes: session.scope?.split(' ') || [],
      userType: session.user_type,
    });

  } catch (error) {
    console.error('GHL status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
