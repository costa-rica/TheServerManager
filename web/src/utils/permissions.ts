/**
 * Permission management utilities for The Server Manager
 *
 * This file defines default accessible pages and permission checking logic.
 * Frontend permissions are UX restrictions only - true security is enforced by the backend API.
 */

/**
 * Pages accessible to ALL authenticated users (regardless of permissions)
 * These should NOT be stored in user.accessPagesArray in the database
 */
export const DEFAULT_ACCESSIBLE_PAGES = [
	"/home",
	"/servers/machines", // Primary landing page accessible to all users
] as const;

/**
 * Permission-controlled pages that can be assigned to non-admin users
 * Used in admin UI for page permission management
 */
export const PERMISSION_CONTROLLED_PAGES = [
	"/servers/services",
	"/dns/nginx",
	"/dns/registrar",
	"/admin",
] as const;

/**
 * Check if user has access to a specific page
 *
 * @param pathname - The page path to check (e.g., "/dns/nginx")
 * @param isAdmin - Whether the user is an admin
 * @param accessPagesArray - Array of page paths the user has explicit access to
 * @returns true if user can access the page, false otherwise
 */
export function hasPageAccess(
	pathname: string,
	isAdmin: boolean,
	accessPagesArray: string[] = []
): boolean {
	// Admin users can access everything
	if (isAdmin) {
		return true;
	}

	// Check if it's a default accessible page
	if (
		DEFAULT_ACCESSIBLE_PAGES.some((page) => pathname.startsWith(page))
	) {
		return true;
	}

	// Check if it's in user's permission array (with safety check)
	if (!accessPagesArray || !Array.isArray(accessPagesArray)) {
		return false;
	}

	return accessPagesArray.some((page) => pathname.startsWith(page));
}

/**
 * Get the first accessible page for a user
 * Used for initial redirect after login
 *
 * @param isAdmin - Whether the user is an admin
 * @param accessPagesArray - Array of page paths the user has explicit access to
 * @returns The first accessible page path
 */
export function getFirstAccessiblePage(
	isAdmin: boolean,
	accessPagesArray: string[] = []
): string {
	if (isAdmin) {
		return "/servers/machines";
	}

	if (accessPagesArray && accessPagesArray.length > 0) {
		return accessPagesArray[0];
	}

	// Default fallback
	return "/home";
}
