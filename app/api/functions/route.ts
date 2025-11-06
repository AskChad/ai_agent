import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createFunctionSchema = z.object({
  name: z.string().min(1, 'Function name is required'),
  description: z.string().min(1, 'Description is required'),
  handler_type: z.enum(['internal', 'webhook', 'api_call', 'database_query']),
  parameters_schema: z.record(z.any()),
  handler_config: z.record(z.any()),
  is_active: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const handler_type = searchParams.get('handler_type');
    const is_active = searchParams.get('is_active');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('ai_functions')
      .select('*, function_call_logs(count)', { count: 'exact' })
      .eq('account_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (handler_type) {
      query = query.eq('handler_type', handler_type);
    }

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true');
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: functions, error, count } = await query;

    if (error) {
      console.error('Functions fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch functions' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      functions,
      total: count,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Get functions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validation = createFunctionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const functionData = validation.data;

    // Create function
    const { data: aiFunction, error } = await supabase
      .from('ai_functions')
      .insert({
        account_id: user.id,
        ...functionData,
      })
      .select()
      .single();

    if (error) {
      console.error('Function creation error:', error);
      return NextResponse.json({ error: 'Failed to create function' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      function: aiFunction,
    });

  } catch (error) {
    console.error('Create function error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
