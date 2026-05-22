import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/enrichment') ||
    pathname.startsWith('/api/leads') ||
    pathname.startsWith('/api/export') ||
    pathname.startsWith('/api/script') ||
    pathname.startsWith('/api/enrichment/trigger') ||
    pathname.startsWith('/api/enrichment/results');
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get('philly-auth')?.value;
  if (token !== 'ok') {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/enrichment/:path*', '/api/:path*'] };
