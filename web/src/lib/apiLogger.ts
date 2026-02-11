/**
 * HTTP Request Logging Middleware for Next.js API Routes
 *
 * This middleware logs HTTP requests to API routes with the following information:
 * - HTTP method
 * - Request path
 * - Response status
 * - Response time in milliseconds
 *
 * Usage in API route:
 * export async function GET(request: NextRequest) {
 *   return withLogging(request, async () => {
 *     // Your API logic here
 *     return NextResponse.json({ data: 'example' });
 *   });
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from './logger';

/**
 * Wraps an API route handler with HTTP request logging
 *
 * @param request - The Next.js request object
 * @param handler - The async handler function that returns a NextResponse
 * @returns The response from the handler
 */
export async function withLogging(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now();
  const method = request.method;
  const url = request.url;
  const pathname = new URL(url).pathname;

  try {
    // Execute the handler
    const response = await handler();
    const duration = Date.now() - startTime;
    const status = response.status;

    // Log the request
    logger.http(`${method} ${pathname} ${status} ${duration}ms`, {
      method,
      pathname,
      status,
      duration,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log error
    logger.error(`${method} ${pathname} ERROR ${duration}ms`, {
      method,
      pathname,
      duration,
      error: error instanceof Error ? error.message : String(error),
    });

    // Re-throw the error to be handled by Next.js
    throw error;
  }
}

/**
 * Alternative middleware for edge runtime or custom logging needs
 * Logs a request and returns metadata
 *
 * @param request - The Next.js request object
 * @returns Metadata object with startTime for manual completion logging
 */
export function logRequestStart(request: NextRequest): { startTime: number; method: string; pathname: string } {
  const startTime = Date.now();
  const method = request.method;
  const url = request.url;
  const pathname = new URL(url).pathname;

  return { startTime, method, pathname };
}

/**
 * Logs the completion of a request
 *
 * @param metadata - Metadata from logRequestStart
 * @param status - HTTP status code
 * @param error - Optional error if request failed
 */
export function logRequestEnd(
  metadata: { startTime: number; method: string; pathname: string },
  status: number,
  error?: Error | unknown
): void {
  const duration = Date.now() - metadata.startTime;

  if (error) {
    logger.error(`${metadata.method} ${metadata.pathname} ERROR ${duration}ms`, {
      method: metadata.method,
      pathname: metadata.pathname,
      duration,
      error: error instanceof Error ? error.message : String(error),
    });
  } else {
    logger.http(`${metadata.method} ${metadata.pathname} ${status} ${duration}ms`, {
      method: metadata.method,
      pathname: metadata.pathname,
      status,
      duration,
    });
  }
}
