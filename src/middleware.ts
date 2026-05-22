import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/api/leads') || pathname.startsWith('/api/export') || pathname.startsWith('/api/script');
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get('philly-auth')?.value;
  if (token !== 'ok') {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/api/:path*'] };
