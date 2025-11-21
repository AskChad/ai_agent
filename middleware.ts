import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { config as appConfig } from '@/lib/config';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow public access to webhook endpoints (bypass Vercel protection)
  // GHL needs to POST to these without authentication
  const isWebhook = path.startsWith('/api/ghl/webhooks/');

  if (isWebhook) {
    // Create response that bypasses protection
    const response = NextResponse.next();
    // Prevent caching of webhook responses
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }

  // Redirect root to login
  if (path === '/') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Create Supabase client and refresh session
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    appConfig.supabase.url,
    appConfig.supabase.anonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session - this is critical for auth to work properly
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
