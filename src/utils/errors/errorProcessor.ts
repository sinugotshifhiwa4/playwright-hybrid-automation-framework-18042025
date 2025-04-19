import axios, { AxiosError } from "axios";
import * as interfaces from "../../models/interfaces/errorHandler";
import { ErrorCategory } from "../../models/enums/errorCategory";
import { AppError } from "./AppError";
import SanitizationConfig from "../sanitization/dataSanitizer";

export default class ErrorProcessor {
  /**
   * Create a standardized error object with source, context, message, and category.
   * HTTP details are added if the error is an Axios error.
   * @param error - The error object to process.
   * @param source - The source of the error.
   * @param context - The context of the error (optional).
   * @returns A structured error object with source, context, message, and category.
   */
  public static createErrorDetails(
    error: unknown,
    source: string,
    context?: string
  ): interfaces.ErrorDetails {
    // Base error details
    const details: interfaces.ErrorDetails = {
      source,
      context: context || this.getContextFromError(error),
      message: this.getErrorMessage(error),
      category: this.categorizeError(error),
    };
  
    this.addHttpDetailsIfAvailable(error, details);
    
    // Ensure no stack trace is included
    if (error instanceof Error) {
      // First convert to unknown, then to Record<string, unknown>
      const errorObj = Object.getOwnPropertyNames(error).reduce((acc, prop) => {
        if (prop !== 'stack') {
          acc[prop] = (error as unknown as Record<string, unknown>)[prop];
        }
        return acc;
      }, {} as Record<string, unknown>);
      
      // Reassign properties to the error object
      Object.assign(error, errorObj);
    }
    
    return details;
  }

  /**
   * Add HTTP details to error details if available
   */
  private static addHttpDetailsIfAvailable(
    error: unknown,
    details: interfaces.ErrorDetails
  ): void {
    if (axios.isAxiosError(error) && error.response?.status) {
      details.statusCode = error.response.status;
      details.url = error.config?.url;
    }
  }

  /**
   * Clean any error message by stripping ANSI sequences and keeping only first line
   */
  public static cleanMessage(message: string): string {
    if (!message) return "";

    // First sanitize the string using SanitizationConfig
    let cleaned = SanitizationConfig.sanitizeString(message);

    // Strip ANSI escape sequences
    // Using the decimal code for ESC (27) in a character class
    const ESC = String.fromCharCode(27);
    cleaned = cleaned.replace(
      new RegExp(
        ESC + "\\[\\d+(?:;\\d+)*m|" + ESC + "\\??[0-9;]*[A-Za-z]",
        "g"
      ),
      ""
    );

    // Strip error prefix and quotes
    cleaned = cleaned.replace(/^'Error: |^'|'$/g, "");

    // Only keep first line (common pattern in stacktraces)
    return cleaned.split("\n")[0];
  }

  /**
   * Get the error message from any error type
   */
  public static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return this.cleanMessage(error.message);
    }

    if (axios.isAxiosError(error)) {
      return this.formatAxiosErrorMessage(error);
    }

    if (typeof error === "string") {
      return this.cleanMessage(error);
    }

    if (error && typeof error === "object") {
      const message = (error as Record<string, unknown>).message;
      if (typeof message === "string") {
        return this.cleanMessage(message);
      }
    }

    return "Unknown error occurred";
  }

  /**
   * Format an Axios error into a readable message
   */
  private static formatAxiosErrorMessage(error: AxiosError): string {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const url = error.config?.url
      ? new URL(error.config.url, "http://example.com").pathname
      : "unknown";

    return `HTTP ${status || "Error"}: ${statusText || error.message} (${
      error.config?.method || "GET"
    } ${url})`;
  }

  /**
   * Determine appropriate context based on error type
   */
  public static getContextFromError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      return "API Request Error";
    }

    if (error instanceof Error && "matcherResult" in error) {
      return "Playwright Test Error";
    }

    const errorMessage = this.getErrorMessageAsLowerCase(error);

    if (this.containsAnyKeyword(errorMessage, ["database", "query", "sql"])) {
      return "Database Error";
    }

    if (
      this.containsAnyKeyword(errorMessage, [
        "permission",
        "access",
        "unauthorized",
      ])
    ) {
      return "Permission Error";
    }

    return "General Error";
  }

  /**
   * Convert error to lowercase string message for pattern matching
   */
  private static getErrorMessageAsLowerCase(error: unknown): string {
    return error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();
  }

  /**
   * Check if a string contains any of the specified keywords
   */
  private static containsAnyKeyword(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }

  /**
   * Categorize errors into defined ErrorCategory interfaces
   */
  public static categorizeError(error: unknown): ErrorCategory {
    if (axios.isAxiosError(error)) {
      return this.categorizeAxiosError(error);
    }

    // Handle Playwright assertion errors
    if (error instanceof Error && "matcherResult" in error) {
      return ErrorCategory.TEST;
    }

    // Handle general errors by message content
    if (error instanceof Error) {
      return this.categorizeErrorByMessage(error);
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Categorize Axios errors based on status code
   */
  private static categorizeAxiosError(error: AxiosError): ErrorCategory {
    const statusCode = error.response?.status;

    if (!statusCode) {
      return ErrorCategory.NETWORK;
    }

    if (statusCode === 401) {
      return ErrorCategory.AUTHENTICATION;
    }

    if (statusCode === 403) {
      return ErrorCategory.AUTHORIZATION;
    }

    if (statusCode === 404) {
      return ErrorCategory.NOT_FOUND;
    }

    if (statusCode >= 400 && statusCode < 500) {
      return ErrorCategory.HTTP_CLIENT;
    }

    if (statusCode >= 500) {
      return ErrorCategory.HTTP_SERVER;
    }

    return ErrorCategory.UNKNOWN;
  }

  // private static categorizeErrorByMessage(error: Error): ErrorCategory {
  //   const msg = error.message.toLowerCase();
  //   // Group keywords by category for easier maintenance
  //   const patterns = {
  //     [ErrorCategory.CONNECTION]: ["connection", "connect"],
  //     [ErrorCategory.QUERY]: ["query", "sql"],
  //     [ErrorCategory.TRANSACTION]: ["transaction"],
  //     [ErrorCategory.CONSTRAINT]: ["constraint", "duplicate"],
  //     [ErrorCategory.DATABASE]: ["database", "db"],
  //     [ErrorCategory.PERMISSION]: ["permission", "access"],
  //     [ErrorCategory.NOT_FOUND]: ["not found", "missing"],
  //     [ErrorCategory.CONFLICT]: ["conflict"],
  //     [ErrorCategory.AUTHENTICATION]: ["authentication", "login"],
  //     [ErrorCategory.AUTHORIZATION]: ["authorization", "forbidden"],
  //     [ErrorCategory.CONFIGURATION]: ["configuration", "config"],
  //     [ErrorCategory.NOT_IMPLEMENTED]: [
  //       "not_implemented",
  //       "unimplemented",
  //     ],
  //     [ErrorCategory.SERVICE]: ["service", "unavailable"],
  //     [ErrorCategory.NETWORK]: ["network"],
  //     [ErrorCategory.TIMEOUT]: ["timeout", "gateway", "retry"],
  //     // UI and interaction error patterns
  //     [ErrorCategory.UI]: ["ui", "interface", "view", "render"],
  //     [ErrorCategory.ELEMENT]: ["element", "component", "dom"],
  //     [ErrorCategory.NAVIGATION]: ["navigation", "route", "redirect"],
  //     [ErrorCategory.SELECTOR]: ["selector", "locator", "xpath", "css"],
  //     [ErrorCategory.ASSERTION]: ["assertion", "expect", "should"],
  //     // Input/Output error patterns
  //     [ErrorCategory.VALIDATION]: ["validation", "invalid", "schema"],
  //     // Test execution error patterns
  //     [ErrorCategory.SETUP]: ["setup", "before", "beforeAll"],
  //     [ErrorCategory.TEARDOWN]: ["teardown", "after", "afterAll"],
  //     // Performance error patterns
  //     [ErrorCategory.PERFORMANCE]: ["performance", "slow", "timeout"],
  //     // Environment error patterns
  //     [ErrorCategory.ENVIRONMENT]: ["environment", "env", "variable"]
  //   };
  //   // Check each category's keywords against the error message
  //   for (const [categoryStr, keywords] of Object.entries(patterns)) {
  //     if (keywords.some((keyword) => msg.includes(keyword))) {
  //       return categoryStr as ErrorCategory;
  //     }
  //   }
  //   // Handle AppError case
  //   if (error instanceof AppError) {
  //     return error.category in ErrorCategory
  //       ? (error.category as ErrorCategory)
  //       : ErrorCategory.UNKNOWN;
  //   }
  //   return ErrorCategory.UNKNOWN;
  // }

  private static categorizeErrorByMessage(error: Error): ErrorCategory {
    const msg = error.message.toLowerCase();
    
    // Check for file system error codes in NodeJS errors
    if (error instanceof Error && "code" in error) {
      switch (error.code) {
        case "ENOENT": return ErrorCategory.FILE_NOT_FOUND;
        case "EISDIR": return ErrorCategory.PATH_IS_DIRECTORY;
        case "ENOTDIR": return ErrorCategory.NOT_A_DIRECTORY;
        case "ENOTEMPTY": return ErrorCategory.DIRECTORY_NOT_EMPTY;
        case "EEXIST": return ErrorCategory.FILE_EXISTS;
        case "EACCES": return ErrorCategory.ACCESS_DENIED;
        case "EBUSY": return ErrorCategory.FILE_BUSY;
        case "EFBIG": return ErrorCategory.FILE_TOO_LARGE;
        case "ENAMETOOLONG": return ErrorCategory.FILE_NAME_TOO_LONG;
        case "ENOSPC": return ErrorCategory.NO_SPACE;
        case "EROFS": return ErrorCategory.READ_ONLY_FILE_SYSTEM;
      }
    }
    
    // Group keywords by category for easier maintenance
    const patterns = {
      // Database related errors
      [ErrorCategory.CONNECTION]: ["connection", "connect"],
      [ErrorCategory.QUERY]: ["query", "sql"],
      [ErrorCategory.TRANSACTION]: ["transaction"],
      [ErrorCategory.CONSTRAINT]: ["constraint", "duplicate"],
      [ErrorCategory.DATABASE]: ["database", "db"],
      
      // Permission and resource errors
      [ErrorCategory.PERMISSION]: ["permission", "access", "denied"],
      [ErrorCategory.NOT_FOUND]: ["not found", "missing", "doesn't exist"],
      [ErrorCategory.CONFLICT]: ["conflict"],
      
      // Authentication and authorization
      [ErrorCategory.AUTHENTICATION]: ["authentication", "login"],
      [ErrorCategory.AUTHORIZATION]: ["authorization", "forbidden"],
      
      // Configuration and service errors
      [ErrorCategory.CONFIGURATION]: ["configuration", "config"],
      [ErrorCategory.NOT_IMPLEMENTED]: ["not_implemented", "unimplemented"],
      [ErrorCategory.SERVICE]: ["service", "unavailable"],
      
      // Network and timeout errors
      [ErrorCategory.NETWORK]: ["network"],
      [ErrorCategory.TIMEOUT]: ["timeout", "gateway", "retry"],
      
      // UI and interaction error patterns
      [ErrorCategory.UI]: ["ui", "interface", "view", "render"],
      [ErrorCategory.ELEMENT]: ["element", "component", "dom"],
      [ErrorCategory.NAVIGATION]: ["navigation", "route", "redirect"],
      [ErrorCategory.SELECTOR]: ["selector", "locator", "xpath", "css"],
      [ErrorCategory.ASSERTION]: ["assertion", "expect", "should"],
      
      // Input/Output error patterns
      [ErrorCategory.VALIDATION]: ["validation", "invalid", "schema"],
      [ErrorCategory.IO]: ["i/o", "input/output"],
      [ErrorCategory.PARSING]: ["parse", "parsing"],
      [ErrorCategory.SERIALIZATION]: ["serialize", "serialization"],
      
      // Test execution error patterns
      [ErrorCategory.SETUP]: ["setup", "before", "beforeAll"],
      [ErrorCategory.TEARDOWN]: ["teardown", "after", "afterAll"],
      [ErrorCategory.TEST]: ["test failed", "test error"],
      [ErrorCategory.FIXTURE]: ["fixture"],
      
      // Performance error patterns
      [ErrorCategory.PERFORMANCE]: ["performance", "slow", "timeout"],
      [ErrorCategory.MEMORY]: ["memory", "out of memory", "heap"],
      [ErrorCategory.RESOURCE_LIMIT]: ["resource limit", "quota"],
      
      // Environment error patterns
      [ErrorCategory.ENVIRONMENT]: ["environment", "env", "variable"],
      [ErrorCategory.DEPENDENCY]: ["dependency", "module", "import"],
      
      // File system error patterns
      [ErrorCategory.FILE_NOT_FOUND]: ["file not found", "no such file", "doesn't exist"],
      [ErrorCategory.PATH_IS_DIRECTORY]: ["is a directory", "cannot write to directory", "cannot read directory as file"],
      [ErrorCategory.NOT_A_DIRECTORY]: ["not a directory"],
      [ErrorCategory.DIRECTORY_NOT_EMPTY]: ["directory not empty"],
      [ErrorCategory.FILE_EXISTS]: ["file already exists", "already exists"],
      [ErrorCategory.ACCESS_DENIED]: ["permission denied", "access denied"],
      [ErrorCategory.NO_SPACE]: ["no space", "disk full"],
      [ErrorCategory.FILE_TOO_LARGE]: ["file too large"]
    };
    
    // Check each category's keywords against the error message
    for (const [categoryStr, keywords] of Object.entries(patterns)) {
      if (keywords.some((keyword) => msg.includes(keyword))) {
        return categoryStr as ErrorCategory;
      }
    }
    
    // Handle AppError case
    if (error instanceof AppError) {
      return error.category in ErrorCategory
        ? (error.category as ErrorCategory)
        : ErrorCategory.UNKNOWN;
    }
    
    return ErrorCategory.UNKNOWN;
  }
  
  /**
   * Create a unique key for caching errors to prevent duplicates
   */
  public static createCacheKey(details: interfaces.ErrorDetails): string {
    return `${details.source}_${details.category}_${details.message.substring(
      0,
      50
    )}`;
  }

  /**
   * Extract additional details from error objects
   */
  public static extractExtraDetails(error: unknown): Record<string, unknown> {
    // Handle Playwright matcher results
    if (error instanceof Error && "matcherResult" in error) {
      return this.extractPlaywrightDetails(
        error as Error & {
          matcherResult?: interfaces.PlaywrightMatcherResult | undefined;
        }
      );
    }

    // Handle axios errors
    if (axios.isAxiosError(error)) {
      return this.extractAxiosDetails(error);
    }

    // Handle general objects
    if (typeof error === "object" && error !== null) {
      return this.sanitizeObject(error as Record<string, unknown>);
    }

    return {};
  }

  /**
   * Extract details from Playwright errors
   */
  private static extractPlaywrightDetails(
    error: Error & { matcherResult?: interfaces.PlaywrightMatcherResult }
  ): Record<string, unknown> {
    const matcher = error.matcherResult;

    if (!matcher) {
      return {};
    }

    return {
      name: matcher.name,
      pass: matcher.pass,
      expected: matcher.expected,
      actual: matcher.actual,
      message: matcher.message ? this.cleanMessage(matcher.message) : undefined,
      log: Array.isArray(matcher.log)
        ? matcher.log
            .filter((entry) => !entry.includes("http"))
            .map((entry) => this.cleanMessage(entry))
        : undefined,
    };
  }

  /**
   * Extract details from Axios errors
   */
  private static extractAxiosDetails(
    error: AxiosError
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {
      status: error.response?.status,
      statusText: error.response?.statusText,
    };

    // Include safe parts of the request
    if (error.config) {
      result.method = error.config.method;
      result.url = error.config.url
        ? new URL(error.config.url, "http://example.com").pathname
        : undefined;
      result.headers = SanitizationConfig.sanitizeHeaders(error.config.headers);
    }

    // Include response data, filtering out any sensitive information
    if (error.response?.data && typeof error.response.data === "object") {
      result.data = this.sanitizeObject(
        error.response.data as Record<string, unknown>
      );
    }

    return result;
  }

  public static sanitizeObject(
    obj: Record<string, unknown>
  ): Record<string, unknown> {
    if (!obj) return {};

    // Define custom sanitization parameters
    const customSanitizationParams = {
      ...SanitizationConfig.getDefaultParams(),
      skipProperties: ["stack"],
      truncateUrls: true,
      maxStringLength: 1000,
    };

    // Use a single sanitization call
    return SanitizationConfig.sanitizeData(obj, customSanitizationParams);
  }

  /**
   * Process sanitized objects for additional cleaning and safe logging
   */
  private static processAndCleanSanitizedObject(
    sanitized: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    // Skip these properties entirely
    const skipProps = ["stack"];

    for (const key in sanitized) {
      if (!Object.prototype.hasOwnProperty.call(sanitized, key)) {
        continue;
      }

      // Skip certain properties entirely
      if (skipProps.some((prop) => key.toLowerCase().includes(prop))) {
        continue;
      }

      const value = sanitized[key];
      result[key] = this.processSanitizedValue(key, value);
    }

    return result;
  }

  /**
   * Process individual values from sanitized object
   */
  private static processSanitizedValue(key: string, value: unknown): unknown {
    if (typeof value === "string") {
      return this.processSanitizedString(value);
    }

    if (typeof value === "object" && value !== null) {
      return this.processSanitizedObject(key, value as Record<string, unknown>);
    }

    if (typeof value !== "function") {
      // Include primitive values directly
      return value;
    }

    return undefined;
  }

  /**
   * Process sanitized string values
   */
  private static processSanitizedString(value: string): string {
    // Clean string values
    const cleanValue = this.cleanMessage(value);

    // Truncate long strings and URLs
    if (cleanValue.includes("http")) {
      const httpIndex = cleanValue.indexOf("http");
      return httpIndex > -1
        ? cleanValue.substring(0, httpIndex) + "..."
        : cleanValue;
    }

    return cleanValue.length > 1000
      ? cleanValue.substring(0, 1000) + "..."
      : cleanValue;
  }

  /**
   * Process sanitized object values
   */
  private static processSanitizedObject(
    key: string,
    value: Record<string, unknown>
  ): unknown {
    // Handle nested objects but avoid circular references
    if (key !== "parent" && key !== "cause") {
      try {
        return this.sanitizeObject(value);
      } catch {
        return "[Complex Object]";
      }
    }
    return "[Circular Reference]";
  }
}