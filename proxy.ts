import { NextRequest, NextResponse } from 'next/server';

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'tiendasmart.com';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostHeader = request.headers.get('host') || '';

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname === '/signup'
  ) {
    return NextResponse.next();
  }

  if (hostHeader.startsWith('localhost:') || hostHeader.startsWith('127.0.0.1:')) {
    return NextResponse.next();
  }

  const host = hostHeader.split(':')[0];

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = host.replace(`.${ROOT_DOMAIN}`, '');

    if (subdomain && subdomain !== 'www') {
      const url = request.nextUrl.clone();
      url.pathname = `/_sites/${subdomain}${pathname === '/' ? '' : pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};