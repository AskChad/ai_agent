import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateKnowledgeSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  document_type: z.enum(['text', 'pdf', 'doc', 'url', 'other']).optional(),
  metadata: z.record(z.any()).optional(),
  agent_id: z.string().uuid().nullable().optional(),
});

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/knowledge/[id] - Get a specific knowledge base document
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

    // Get document with authorization check
    const { data: document, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('id', params.id)
      .eq('account_id', user.id)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Get knowledge base document error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/knowledge/[id] - Update a knowledge base document
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

    const body = await request.json();

    // Validate input
    const validation = updateKnowledgeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Verify ownership before update
    const { data: existingDocument } = await supabase
      .from('knowledge_base')
      .select('id')
      .eq('id', params.id)
      .eq('account_id', user.id)
      .single();

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found or unauthorized' }, { status: 404 });
    }

    // Update document
    const { data: document, error } = await supabase
      .from('knowledge_base')
      .update(validation.data)
      .eq('id', params.id)
      .eq('account_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Knowledge base update error:', error);
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Update knowledge base error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/knowledge/[id] - Delete a knowledge base document
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

    // Delete document with authorization check
    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', params.id)
      .eq('account_id', user.id);

    if (error) {
      console.error('Knowledge base deletion error:', error);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Delete knowledge base error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
