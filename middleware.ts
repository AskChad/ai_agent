import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { config as appConfig } from '@/lib/config';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow public access to webhook endpoints (bypass Vercel protection)
  // GHL needs to POST to these without authentication
  const isWebhook = path.startsWith('/api/ghl/webhooks/');

  if (isWebhook) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
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

  // Get current user - this also refreshes the session
  const { data: { user }, error } = await supabase.auth.getUser();

  // Define route types
  const isAuthRoute = path.startsWith('/auth');
  const isProtectedRoute = path.startsWith('/dashboard') ||
                          (path.startsWith('/api/') && !path.startsWith('/api/auth'));
  const isRootPath = path === '/';

  // Redirect root to appropriate page
  if (isRootPath) {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Protect dashboard and API routes - redirect to login if not authenticated
  if (isProtectedRoute && !user) {
    // For API routes, return 401 instead of redirect
    if (path.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    // For page routes, redirect to login
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirectTo', path);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && user && !path.includes('logout')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

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
