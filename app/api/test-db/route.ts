import { getAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = getAdminClient();

    console.log('Testing database connection...');

    // Test query
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('ghl_location_id', 'test_location_456')
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 500 });
    }

    console.log('Account found:', data);

    return NextResponse.json({
      success: true,
      account: data
    });

  } catch (error: any) {
    console.error('Exception:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
