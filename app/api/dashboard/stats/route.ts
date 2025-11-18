import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const client = await db.getClient();
    try {
      // Get total conversations count
      const conversationsResult = await client.query(
        `SELECT COUNT(*) as total FROM conversations WHERE account_id = $1`,
        [user.id]
      );
      const totalConversations = parseInt(conversationsResult.rows[0]?.total || '0');

      // Get active functions count
      const functionsResult = await client.query(
        `SELECT COUNT(*) as total FROM functions WHERE account_id = $1 AND is_active = true`,
        [user.id]
      );
      const activeFunctions = parseInt(functionsResult.rows[0]?.total || '0');

      // Get messages today count
      const messagesTodayResult = await client.query(
        `SELECT COUNT(*) as total
         FROM messages
         WHERE conversation_id IN (
           SELECT id FROM conversations WHERE account_id = $1
         )
         AND created_at >= CURRENT_DATE`,
        [user.id]
      );
      const messagesToday = parseInt(messagesTodayResult.rows[0]?.total || '0');

      // Get recent conversations with actual user data
      const recentConversationsResult = await client.query(
        `SELECT
          c.id,
          c.title,
          c.status,
          c.updated_at,
          (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
         FROM conversations c
         WHERE c.account_id = $1
         ORDER BY c.updated_at DESC
         LIMIT 5`,
        [user.id]
      );

      // Get function performance stats
      const functionPerformanceResult = await client.query(
        `SELECT
          f.name,
          COUNT(fl.id) as total_calls,
          COUNT(CASE WHEN fl.success = true THEN 1 END) as successful_calls
         FROM functions f
         LEFT JOIN function_logs fl ON f.id = fl.function_id
         WHERE f.account_id = $1 AND f.is_active = true
         GROUP BY f.id, f.name
         ORDER BY total_calls DESC
         LIMIT 5`,
        [user.id]
      );

      // Calculate average response time (if we have message data)
      const avgResponseTimeResult = await client.query(
        `SELECT
          AVG(EXTRACT(EPOCH FROM (m2.created_at - m1.created_at))) as avg_seconds
         FROM messages m1
         JOIN messages m2 ON m1.conversation_id = m2.conversation_id
         WHERE m1.conversation_id IN (
           SELECT id FROM conversations WHERE account_id = $1
         )
         AND m1.role = 'user'
         AND m2.role = 'assistant'
         AND m2.created_at > m1.created_at
         AND m2.created_at >= CURRENT_DATE - INTERVAL '30 days'`,
        [user.id]
      );
      const avgResponseSeconds = parseFloat(avgResponseTimeResult.rows[0]?.avg_seconds || '0');

      return NextResponse.json({
        success: true,
        stats: {
          totalConversations,
          activeFunctions,
          messagesToday,
          avgResponseTime: avgResponseSeconds > 0 ? `${avgResponseSeconds.toFixed(1)}s` : 'N/A',
          recentConversations: recentConversationsResult.rows.map(row => ({
            id: row.id,
            title: row.title || 'Untitled Conversation',
            status: row.status,
            lastMessage: row.last_message,
            lastMessageTime: row.last_message_time,
            updatedAt: row.updated_at
          })),
          functionPerformance: functionPerformanceResult.rows.map(row => ({
            name: row.name,
            calls: parseInt(row.total_calls || '0'),
            success: row.total_calls > 0
              ? Math.round((parseInt(row.successful_calls || '0') / parseInt(row.total_calls || '1')) * 100)
              : 0
          }))
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
