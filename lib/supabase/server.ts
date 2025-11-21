/**
 * Supabase Server Client
 *
 * Server-side Supabase client for use in:
 * - API routes
 * - Server Components
 * - Server Actions
 *
 * Uses service role key for elevated permissions.
 *
 * Usage:
 * import { createClient } from '@/lib/supabase/server'
 * const supabase = createClient()
 * const { data } = await supabase.from('table').select()
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { config } from '@/lib/config'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Create an admin client with service role key
 * Use this for operations that bypass RLS
 */
export async function createAdminClient() {
  const cookieStore = await cookies()

  return createServerClient(
    config.supabase.url,
    config.supabase.serviceRoleKey, // Admin key!
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Ignore
          }
        },
      },
    }
  )
}
