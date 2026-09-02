
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isAdminPath = req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/api/admin') || req.nextUrl.pathname === '/api/import';
  // @ts-ignore
  const isAdmin = !!req.auth?.user?.isAdmin;

  if (isAdminPath && !isAdmin) {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', req.url));
  }
});

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/import/:path*'],
};

