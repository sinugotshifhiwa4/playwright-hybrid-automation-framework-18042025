import { ErrorCategory } from "../enums/errorCategory";
/**
 * Interface for structured error logging
 */
export interface ErrorDetails {
  source: string; // Where the error occurred (method, component)
  context?: string; // Additional context about the error
  message: string; // Human-readable error message
  category: ErrorCategory; // Classification of the error
  statusCode?: number; // HTTP status code if applicable
  url?: string; // URL for API errors
  details?: Record<string, unknown>; // Additional structured data
}

/**
 * Interface for Playwright matcher results in assertion errors
 */
export interface PlaywrightMatcherResult {
  name: string;
  pass: boolean;
  expected: unknown;
  actual: unknown;
  message?: string;
  log?: string[];
}

/**
 * Configuration for request expectations
 */
export interface RequestExpectation {
  expectedStatusCodes: number[];
  expectedCategories?: ErrorCategory[];
  isNegativeTest: boolean;
}
