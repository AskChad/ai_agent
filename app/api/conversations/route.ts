import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createConversationSchema = z.object({
  contact_name: z.string().min(1, 'Contact name is required'),
  contact_phone: z.string().optional(),
  contact_email: z.string().email().optional(),
  ghl_contact_id: z.string().optional(),
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
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('conversations')
      .select('*, messages(count)', { count: 'exact' })
      .eq('account_id', user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%,contact_email.ilike.%${search}%`);
    }

    const { data: conversations, error, count } = await query;

    if (error) {
      console.error('Conversations fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      conversations,
      total: count,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Get conversations error:', error);
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
    const validation = createConversationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { contact_name, contact_phone, contact_email, ghl_contact_id } = validation.data;

    // Create conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        account_id: user.id,
        contact_name,
        contact_phone,
        contact_email,
        ghl_contact_id,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Conversation creation error:', error);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      conversation,
    });

  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
