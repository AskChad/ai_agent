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

/**
 * Insert a record into a table using the admin client (bypasses RLS)
 * Uses type assertion to bypass the typed Supabase client
 */
export async function adminInsert(table: string, data: Record<string, unknown>): Promise<{ error: { message: string; code?: string } | null }> {
  const client = getAdminClient()
  // Cast to bypass strict typing from generated types
  const result = await (client.from(table) as ReturnType<typeof client.from>).insert(data as never)
  return { error: result.error }
}

/**
 * Insert a record and return the inserted data
 * Uses type assertion to bypass the typed Supabase client
 */
export async function adminInsertAndSelect(table: string, data: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null; error: { message: string; code?: string } | null }> {
  const client = getAdminClient()
  // Cast to bypass strict typing from generated types
  const result = await (client.from(table) as ReturnType<typeof client.from>).insert(data as never).select().single()
  return { data: result.data as Record<string, unknown> | null, error: result.error }
}
