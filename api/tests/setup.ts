/**
 * Jest Test Setup
 * Sets up the test environment before tests run
 */

// Set NODE_ENV to test to prevent app.ts from auto-initializing
process.env.NODE_ENV = "test";

// Set JWT_SECRET for tests
process.env.JWT_SECRET = "test-secret-key-for-testing";

// Logger requires these env vars at import time
process.env.NAME_APP = process.env.NAME_APP || "TestServerManagerAPI";
process.env.PATH_TO_LOGS = process.env.PATH_TO_LOGS || "/tmp/tsm-test-logs";
