/**
 * Supabase Admin Client (No Cookies)
 *
 * Use this for:
 * - Webhooks (no cookie context)
 * - Background jobs
 * - Server-side operations that bypass RLS
 *
 * This client uses the service role key and does NOT require cookies.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from '@/lib/config'

let adminClient: ReturnType<typeof createClient> | null = null

export function getAdminClient() {
  if (adminClient) {
    return adminClient
  }

  adminClient = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  return adminClient
}
