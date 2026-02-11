/**
 * Next.js Instrumentation File
 *
 * This file is executed once when the Next.js server starts.
 * It's the ideal place to initialize the Winston logger with console monkey-patching.
 *
 * The logger will:
 * - In production (NEXT_PUBLIC_MODE=production): Write to files in PATH_TO_LOGS
 * - In development: Output to console only
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import and initialize the logger
    // The act of importing initializes the logger and monkey-patches console
    await import('./lib/logger');

    console.info('[Instrumentation] Winston logger initialized');
  }
}
