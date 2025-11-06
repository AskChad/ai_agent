import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateFunctionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  handler_type: z.enum(['internal', 'webhook', 'api_call', 'database_query']).optional(),
  parameters_schema: z.record(z.any()).optional(),
  handler_config: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = params;

    // Get function with call logs
    const { data: aiFunction, error } = await supabase
      .from('ai_functions')
      .select(`
        *,
        function_call_logs (
          id,
          status,
          execution_time_ms,
          created_at
        )
      `)
      .eq('id', id)
      .eq('account_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Function not found' }, { status: 404 });
      }
      console.error('Function fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch function' }, { status: 500 });
    }

    // Get statistics
    const { data: stats } = await supabase
      .from('function_call_logs')
      .select('status')
      .eq('function_id', id);

    const statistics = {
      total_calls: stats?.length || 0,
      successful: stats?.filter(s => s.status === 'success').length || 0,
      failed: stats?.filter(s => s.status === 'error').length || 0,
    };

    return NextResponse.json({
      success: true,
      function: {
        ...aiFunction,
        statistics,
      },
    });

  } catch (error) {
    console.error('Get function error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Validate input
    const validation = updateFunctionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Update function
    const { data: aiFunction, error } = await supabase
      .from('ai_functions')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('account_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Function not found' }, { status: 404 });
      }
      console.error('Function update error:', error);
      return NextResponse.json({ error: 'Failed to update function' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      function: aiFunction,
    });

  } catch (error) {
    console.error('Update function error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = params;

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('ai_functions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('account_id', user.id);

    if (error) {
      console.error('Function deletion error:', error);
      return NextResponse.json({ error: 'Failed to delete function' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Function deleted successfully',
    });

  } catch (error) {
    console.error('Delete function error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
