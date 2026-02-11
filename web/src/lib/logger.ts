/**
 * Winston Logger Configuration for Next.js
 *
 * This module implements server-side logging using Winston with the following features:
 * - Production: File-based logging with rotation in PATH_TO_LOGS directory
 * - Development: Console output only
 * - Monkey-patches console.* methods to use Winston
 * - Server-side only (client-side logs remain as console output)
 *
 * Environment Variables:
 * - NEXT_PUBLIC_MODE: 'production' or 'workstation'/'development'
 * - NAME_APP: Application identifier for log filenames
 * - PATH_TO_LOGS: Directory path for log file storage (production only)
 * - LOG_MAX_SIZE: Maximum size per log file in bytes (default: 10MB)
 * - LOG_MAX_FILES: Maximum number of log files to retain (default: 10)
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Only initialize Winston on server-side
const isServer = typeof window === 'undefined';

let logger: winston.Logger;
let isInitialized = false;

if (isServer) {
  // Determine if we're in production mode
  // Use NEXT_PUBLIC_MODE per the logging spec, fallback to NODE_ENV
  const isProduction = process.env.NEXT_PUBLIC_MODE === 'production' ||
                       process.env.NODE_ENV === 'production';

  const appName = process.env.NAME_APP || 'TheServerManagerNextJs';
  const logDir = process.env.PATH_TO_LOGS || './logs';
  const maxSize = parseInt(process.env.LOG_MAX_SIZE || '10485760', 10); // 10MB default
  const maxFiles = parseInt(process.env.LOG_MAX_FILES || '10', 10); // 10 files default

  // Define log format for file output (human-readable)
  const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).filter(k => k !== 'timestamp' && k !== 'level' && k !== 'message').length
        ? ' ' + JSON.stringify(Object.fromEntries(Object.entries(meta).filter(([k]) => k !== 'timestamp' && k !== 'level' && k !== 'message')))
        : '';
      return `[${timestamp}] [${level.toUpperCase()}] [${appName}] ${message}${metaStr}`;
    })
  );

  // Define console format for development (colorized, simpler)
  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).filter(k => k !== 'timestamp' && k !== 'level' && k !== 'message').length
        ? ' ' + JSON.stringify(Object.fromEntries(Object.entries(meta).filter(([k]) => k !== 'timestamp' && k !== 'level' && k !== 'message')))
        : '';
      return `${timestamp} ${level} [${appName}] ${message}${metaStr}`;
    })
  );

  // Create logger instance
  logger = winston.createLogger({
    level: isProduction ? 'info' : 'debug',
    format: fileFormat,
    transports: [],
  });

  // Add transports based on environment
  if (isProduction) {
    // Production: File-based logging
    try {
      // Create log directory if it doesn't exist
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
        logger.warn(`Created log directory: ${logDir}`);
      }

      // Add file transport with rotation
      logger.add(
        new winston.transports.File({
          filename: path.join(logDir, `${appName}.log`),
          maxsize: maxSize,
          maxFiles: maxFiles,
          tailable: true,
        })
      );

      console.info(`[Logger] Production mode - logging to: ${path.join(logDir, appName + '.log')}`);
    } catch (error) {
      // If file logging fails, fall back to console
      console.error('[Logger] Failed to initialize file logging, falling back to console:', error);
      logger.add(
        new winston.transports.Console({
          format: consoleFormat,
        })
      );
    }
  } else {
    // Development: Console output only
    logger.add(
      new winston.transports.Console({
        format: consoleFormat,
      })
    );
    console.info('[Logger] Development mode - logging to console only');
  }

  // Monkey-patch console methods to use Winston
  // Store original console methods for internal use
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  };

  // Override console methods
  console.log = (...args: unknown[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    logger.info(message);
  };

  console.error = (...args: unknown[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    logger.error(message);
  };

  console.warn = (...args: unknown[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    logger.warn(message);
  };

  console.info = (...args: unknown[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    logger.info(message);
  };

  console.debug = (...args: unknown[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    logger.debug(message);
  };

  // Export original console methods for internal use if needed
  (logger as unknown as { originalConsole: typeof originalConsole }).originalConsole = originalConsole;

  isInitialized = true;
} else {
  // Client-side: Create a dummy logger that just uses console
  // This ensures we can import logger safely in shared code
  logger = {
    info: (...args: unknown[]) => console.log(...args),
    error: (...args: unknown[]) => console.error(...args),
    warn: (...args: unknown[]) => console.warn(...args),
    debug: (...args: unknown[]) => console.debug(...args),
    http: (...args: unknown[]) => console.log(...args),
  } as winston.Logger;
}

export { logger, isInitialized };
export default logger;
