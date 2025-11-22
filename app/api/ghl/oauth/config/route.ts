import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { EncryptionService } from '@/lib/services/encryption.service';

/**
 * GET /api/ghl/oauth/config
 * Get OAuth app configuration for GHL
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch OAuth config from database (using admin client to bypass RLS)
    const { data: config, error: configError } = await adminSupabase
      .from('oauth_app_configs')
      .select('*')
      .eq('provider', 'ghl')
      .eq('created_by', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (configError) {
      console.error('Error fetching OAuth config:', configError);
      return NextResponse.json(
        { error: 'Failed to fetch OAuth configuration' },
        { status: 500 }
      );
    }

    if (!config) {
      // No config found, return null
      return NextResponse.json({ config: null });
    }

    // Decrypt client secret before returning
    let decryptedSecret = '';
    try {
      const encryptionService = new EncryptionService();
      decryptedSecret = encryptionService.decrypt(config.client_secret);
    } catch (error) {
      console.error('Error decrypting client secret:', error);
      // Return masked secret if decryption fails
      decryptedSecret = '********';
    }

    return NextResponse.json({
      config: {
        id: config.id,
        provider: config.provider,
        app_name: config.app_name,
        app_description: config.app_description,
        client_id: config.client_id,
        client_secret: decryptedSecret,
        redirect_uri: config.redirect_uri,
        scopes: config.scopes,
        agency_exchange: config.agency_exchange || false,
        is_active: config.is_active,
        created_at: config.created_at,
        updated_at: config.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Get OAuth config error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ghl/oauth/config
 * Create or update OAuth app configuration
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { app_name, app_description, client_id, client_secret, redirect_uri, scopes, agency_exchange } = body;

    // Validate required fields
    if (!client_id || !client_secret || !redirect_uri) {
      return NextResponse.json(
        { error: 'Missing required fields: client_id, client_secret, redirect_uri' },
        { status: 400 }
      );
    }

    // Encrypt client secret
    const encryptionService = new EncryptionService();
    const encryptedSecret = encryptionService.encrypt(client_secret);

    // Check if config already exists (using admin client to bypass RLS)
    const { data: existingConfig } = await adminSupabase
      .from('oauth_app_configs')
      .select('id')
      .eq('provider', 'ghl')
      .eq('created_by', user.id)
      .maybeSingle();

    if (existingConfig) {
      // Update existing config (using admin client to bypass RLS)
      const { error: updateError } = await adminSupabase
        .from('oauth_app_configs')
        .update({
          app_name,
          app_description,
          client_id,
          client_secret: encryptedSecret,
          redirect_uri,
          scopes,
          agency_exchange: agency_exchange || false,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('provider', 'ghl')
        .eq('created_by', user.id);

      if (updateError) {
        console.error('Error updating OAuth config:', updateError);
        return NextResponse.json(
          { error: 'Failed to update OAuth configuration: ' + updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'OAuth configuration updated successfully',
      });
    } else {
      // Insert new config (using admin client to bypass RLS)
      const { error: insertError } = await adminSupabase
        .from('oauth_app_configs')
        .insert({
          provider: 'ghl',
          app_name,
          app_description,
          client_id,
          client_secret: encryptedSecret,
          redirect_uri,
          scopes,
          agency_exchange: agency_exchange || false,
          created_by: user.id,
          updated_by: user.id,
          is_active: true,
        });

      if (insertError) {
        console.error('Error creating OAuth config:', insertError);
        return NextResponse.json(
          { error: 'Failed to create OAuth configuration: ' + insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'OAuth configuration created successfully',
      });
    }
  } catch (error: any) {
    console.error('Save OAuth config error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ghl/oauth/config
 * Deactivate OAuth app configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Deactivate config (soft delete) - using admin client to bypass RLS
    const { error: deleteError } = await adminSupabase
      .from('oauth_app_configs')
      .update({
        is_active: false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('provider', 'ghl')
      .eq('created_by', user.id);

    if (deleteError) {
      console.error('Error deactivating OAuth config:', deleteError);
      return NextResponse.json(
        { error: 'Failed to deactivate OAuth configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OAuth configuration deactivated successfully',
    });
  } catch (error: any) {
    console.error('Delete OAuth config error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
