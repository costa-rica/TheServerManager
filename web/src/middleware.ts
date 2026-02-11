// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes that don't require authentication
const publicRoutes = ["/login", "/register", "/forgot-password"];

// Define public route patterns that use startsWith matching
const publicRoutePatterns = ["/forgot-password/reset/"];

// Define API routes that should be excluded from middleware
const apiRoutes = ["/api"];

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Allow API routes to pass through
	if (apiRoutes.some((route) => pathname.startsWith(route))) {
		return NextResponse.next();
	}

	// Allow exact-match public routes
	if (publicRoutes.includes(pathname)) {
		return NextResponse.next();
	}

	// Allow pattern-matched public routes
	if (publicRoutePatterns.some((pattern) => pathname.startsWith(pattern))) {
		return NextResponse.next();
	}

	// Check for auth token cookie
	const token = request.cookies.get("auth-token");

	// If no token, redirect to login
	if (!token) {
		const loginUrl = new URL("/login", request.url);
		return NextResponse.redirect(loginUrl);
	}

	// Token exists, allow access
	return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public files (images, etc.)
		 */
		"/((?!_next/static|_next/image|favicon.ico|images|icons).*)",
	],
};
