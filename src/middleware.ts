import { NextResponse, type NextRequest } from 'next/server';

// Per-request nonce + Content-Security-Policy. Scripts are limited to same-origin
// and the request nonce (which Next applies to its own inline bootstrap). Styles
// allow 'unsafe-inline' because Tailwind and React Flow emit inline styles.

export function middleware(request: NextRequest) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const nonce = btoa(binary);

  const isDev = process.env.NODE_ENV !== 'production';
  const scriptSrc = `'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''}`;

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc}`,
    "connect-src 'self'",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
