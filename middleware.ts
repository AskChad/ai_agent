import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/api/ghl/webhooks/:path*'],
};
