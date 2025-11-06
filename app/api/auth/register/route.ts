import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name is required'),
  account_name: z.string().min(2, 'Account name is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, password, full_name, account_name } = validation.data;
    const supabase = await createClient();

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
        },
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Registration failed' },
        { status: 400 }
      );
    }

    // Create account record
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .insert({
        id: authData.user.id,
        account_name,
        is_active: true,
      })
      .select()
      .single();

    if (accountError) {
      console.error('Account creation error:', accountError);
      // User was created but account failed - this is ok, they can still log in
    }

    // Create default account settings
    if (account) {
      const { error: settingsError } = await supabase
        .from('account_settings')
        .insert({
          account_id: account.id,
          context_window_days: 30,
          context_window_messages: 60,
          max_context_tokens: 8000,
          enable_semantic_search: true,
          enable_rag: true,
          default_ai_provider: 'openai',
        });

      if (settingsError) {
        console.error('Settings creation error:', settingsError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        created_at: authData.user.created_at,
      },
      account: account || null,
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
