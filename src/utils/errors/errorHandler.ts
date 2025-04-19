import axios from "axios";
import RequestContext from "../errors/requestContext";
import { ErrorCategory } from "../../models/enums/errorCategory";
import logger from "../logging/loggerManager";
import ErrorHandlerHelpers from "./errorProcessor";

export default class ErrorHandler {
  // Cache to prevent duplicate error logging
  private static loggedErrors = new Set<string>();

  // Max size for the error cache to prevent memory leaks
  private static readonly MAX_CACHE_SIZE = 1000;

  /**
   * Main error handler method - use this as the primary entry point
   */
  public static captureError(
    error: unknown,
    source: string,
    context?: string
  ): void {
    try {
      // Skip error logging if this is an expected error in a negative test
      if (this.shouldSkipErrorLogging(error, context)) {
        // Log as info instead of error for expected negative test results
        if (axios.isAxiosError(error) && error.response?.status) {
          logger.info(
            `Expected error in negative test [${context}]: Status ${error.response.status}`
          );
        }
        return; // Exit early to prevent further logging
      }
      // Generate error details
      const details = ErrorHandlerHelpers.createErrorDetails(
        error,
        source,
        context
      );
      // Create a cache key to avoid duplicate logging
      const cacheKey = ErrorHandlerHelpers.createCacheKey(details);
      // Skip if already logged recently
      if (this.loggedErrors.has(cacheKey)) {
        return;
      }
      // Add to cache and maintain cache size
      this.manageCacheSize(cacheKey);
      // Sanitize and log the structured error - ensure stack trace is removed
      const sanitizedDetails = ErrorHandlerHelpers.sanitizeObject(
        details as unknown as Record<string, unknown>
      );
      logger.error(JSON.stringify(sanitizedDetails, null, 2));
      // Log additional details if available
      const extraDetails = ErrorHandlerHelpers.extractExtraDetails(error);
      if (Object.keys(extraDetails).length > 0) {
        logger.error(
          JSON.stringify(
            {
              source,
              type: extraDetails?.statusText || "Unknown",
              details: extraDetails,
            },
            null,
            2
          )
        );
      }
    } catch (loggingError) {
      // Fallback for errors during error handling
      logger.error(
        JSON.stringify(
          {
            source,
            context: "Error Handler Failure",
            message: ErrorHandlerHelpers.getErrorMessage(loggingError),
            category: ErrorCategory.UNKNOWN,
          },
          null,
          2
        )
      );
    }
  }

  /**
   * Log and throw an error with the provided message
   */
  public static logAndThrow(message: string, source: string): never {
    this.captureError(new Error(message), source);
    throw new Error(message);
  }

  /**
   * Log error but continue execution
   */
  public static logAndContinue(
    error: unknown,
    source: string,
    context?: string
  ): void {
    this.captureError(
      error,
      source,
      context ? `${context} (non-fatal)` : "Non-fatal error"
    );
  }

  /**
   * Reset the logged errors cache (useful for testing)
   */
  public static resetCache(): void {
    this.loggedErrors.clear();
  }

  /**
   * Check if error should be skipped based on request context
   */
  private static shouldSkipErrorLogging(
    error: unknown,
    context?: string
  ): boolean {
    if (!context) return false;

    if (axios.isAxiosError(error) && error.response?.status) {
      return (
        RequestContext.isExpectedStatus(context, error.response.status) &&
        RequestContext.isNegativeTest(context)
      );
    }

    return false;
  }

  /**
   * Add item to cache and maintain max size
   */
  private static manageCacheSize(cacheKey: string): void {
    this.loggedErrors.add(cacheKey);
    if (this.loggedErrors.size > this.MAX_CACHE_SIZE) {
      const firstItem = this.loggedErrors.values().next().value;
      if (firstItem !== undefined) {
        this.loggedErrors.delete(firstItem);
      }
    }
  }

  /**
   * Public accessor for getErrorMessage to maintain API compatibility
   */
  public static getErrorMessage(error: unknown): string {
    return ErrorHandlerHelpers.getErrorMessage(error);
  }
}
