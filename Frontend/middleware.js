import { NextResponse } from 'next/server';
import { getDashboardPathByRole, ROLES } from './utils/roles';

function parseTokenPayload(token) {
  try {
    const [, payload] = String(token || '').split('.');
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = parseTokenPayload(token);
  return typeof payload?.exp !== 'number' || Date.now() >= payload.exp * 1000;
}

function buildLoginResponse(request) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);

  const response = NextResponse.redirect(loginUrl);
  response.cookies.set('auth_token', '', { path: '/', maxAge: 0 });
  response.cookies.set('auth_user', '', { path: '/', maxAge: 0 });
  response.cookies.set('auth_role', '', { path: '/', maxAge: 0 });

  return response;
}

function getExpectedRole(pathname) {
  if (pathname.startsWith('/client')) {
    return ROLES.CLIENT;
  }

  if (pathname.startsWith('/technician')) {
    return ROLES.TECHNICIAN;
  }

  if (pathname.startsWith('/admin')) {
    return ROLES.ADMIN;
  }

  return null;
}

export function middleware(request) {
  const token = request.cookies.get('auth_token')?.value;
  const role = request.cookies.get('auth_role')?.value;
  const expectedRole = getExpectedRole(request.nextUrl.pathname);

  if (!token) {
    return buildLoginResponse(request);
  }

  if (isTokenExpired(token)) {
    return buildLoginResponse(request);
  }

  if (role && expectedRole && role !== expectedRole) {
    return NextResponse.redirect(new URL(getDashboardPathByRole(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/client/:path*', '/technician/:path*', '/admin/:path*'],
};
