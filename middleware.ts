import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Path yang boleh diakses tanpa login (termasuk API login agar request sampai ke route)
const publicPaths = ['/login', '/api/login'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('kosan_admin')?.value;
  const isPublic = publicPaths.some((p) => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + '/'));
  if (isPublic) {
    if (token && request.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
