import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createKnowledgeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  document_type: z.enum(['text', 'pdf', 'doc', 'url', 'other']).default('text'),
  metadata: z.record(z.any()).optional(),
  agent_id: z.string().uuid().optional(),
});

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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const document_type = searchParams.get('document_type');
    const search = searchParams.get('search');
    const agent_id = searchParams.get('agent_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('knowledge_base')
      .select('*', { count: 'exact' })
      .eq('account_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (document_type) {
      query = query.eq('document_type', document_type);
    }

    if (agent_id) {
      query = query.eq('agent_id', agent_id);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data: documents, error, count } = await query;

    if (error) {
      console.error('Knowledge base fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      documents,
      total: count,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Get knowledge base error:', error);
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
    const validation = createKnowledgeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const documentData = validation.data;

    // Create knowledge base entry
    const { data: document, error } = await supabase
      .from('knowledge_base')
      .insert({
        account_id: user.id,
        ...documentData,
      })
      .select()
      .single();

    if (error) {
      console.error('Knowledge base creation error:', error);
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document,
    });

  } catch (error) {
    console.error('Create knowledge base error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
