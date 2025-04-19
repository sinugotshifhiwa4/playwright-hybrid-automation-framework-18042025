import { SanitizationParams } from "./sanitizationParams";

export default class SanitizationConfig {
  private static defaultSanitizationParams: SanitizationParams = {
    sensitiveKeys: [
      "password",
      "apiKey",
      "secret",
      "authorization",
      "token",
      "accessToken",
      "refreshToken",
      "cookie",
    ],
    maskValue: "********",
  };

  /**
   * Updates the default sanitization parameters
   * @param params Partial sanitization parameters to update
   */
  public static updateDefaultParams(params: Partial<SanitizationParams>): void {
    this.defaultSanitizationParams = {
      ...this.defaultSanitizationParams,
      ...params,
    };
  }

  /**
   * Get current default sanitization parameters
   * @returns Current default sanitization parameters
   */
  public static getDefaultParams(): SanitizationParams {
    return { ...this.defaultSanitizationParams };
  }

  /**
   * Sanitizes sensitive data from an object or error
   * @param data - The data to sanitize
   * @param config - Sanitization configuration
   * @returns Sanitized data
   */
  public static sanitizeData<T>(
    data: T,
    config: SanitizationParams = this.defaultSanitizationParams
  ): T {
    // Handle null or undefined
    if (data === null || data === undefined) return data;

    // Handle primitive types
    if (typeof data !== "object") {
      // Handle string truncation for primitive string values
      if (typeof data === "string" && config.maxStringLength) {
        return this.truncateString(
          data,
          config.maxStringLength
        ) as unknown as T;
      }
      return data;
    }

    // Create a Set for O(1) lookups
    const sensitiveKeysSet = new Set(
      config.sensitiveKeys.map((key) => key.toLowerCase())
    );

    // Type guard to check if input is an array
    if (Array.isArray(data)) {
      return data.map((item) =>
        typeof item === "object" && item !== null
          ? this.sanitizeData(item, config)
          : item
      ) as T;
    }

    // Type guard to check if input is an object
    if (typeof data === "object") {
      const sanitizedObject = { ...(data as object) } as Record<
        string,
        unknown
      >;

      // Handle skipProperties - remove properties that should be skipped
      if (config.skipProperties && config.skipProperties.length > 0) {
        for (const key of Object.keys(sanitizedObject)) {
          if (
            config.skipProperties.some((prop) =>
              key.toLowerCase().includes(prop.toLowerCase())
            )
          ) {
            delete sanitizedObject[key];
            continue; // Skip to next property
          }
        }
      }

      // Process remaining properties
      Object.keys(sanitizedObject).forEach((key) => {
        // Check if key matches sensitive keys (case-insensitive)
        if (
          sensitiveKeysSet.has(key.toLowerCase()) ||
          config.sensitiveKeys.some((sensitiveKey) =>
            key.toLowerCase().includes(sensitiveKey.toLowerCase())
          )
        ) {
          sanitizedObject[key] = config.maskValue;
        } else {
          const value = sanitizedObject[key];

          // Process string values with URL sanitization and truncation
          if (typeof value === "string") {
            let processedValue = value;

            // Sanitize URLs if enabled
            if (config.truncateUrls && processedValue.includes("http")) {
              processedValue = this.sanitizeUrl(processedValue);
            }

            // Truncate long strings if maximum length is specified
            if (config.maxStringLength) {
              processedValue = this.truncateString(
                processedValue,
                config.maxStringLength
              );
            }

            sanitizedObject[key] = processedValue;
          }
          // Recursively sanitize nested objects
          else if (typeof value === "object" && value !== null) {
            sanitizedObject[key] = this.sanitizeData(value, config);
          }
        }
      });

      return sanitizedObject as T;
    }

    // Fallback return
    return data;
  }

  /**
   * Truncates a string to the specified maximum length
   * @param value - String to truncate
   * @param maxLength - Maximum length (default: 1000)
   * @returns Truncated string with ellipsis if necessary
   */
  private static truncateString(value: string, maxLength = 1000): string {
    return value.length > maxLength
      ? value.substring(0, maxLength) + "..."
      : value;
  }

  /**
   * Sanitizes URLs by truncating after the http portion
   * @param value - String potentially containing URLs
   * @returns String with URLs truncated
   */
  private static sanitizeUrl(value: string): string {
    if (value.includes("http")) {
      const httpIndex = value.indexOf("http");
      return httpIndex > -1 ? value.substring(0, httpIndex) + "..." : value;
    }
    return value;
  }

  /**
   * Sanitizes data by specific paths (e.g., "user.credentials.password")
   * @param data - The data to sanitize
   * @param paths - Array of dot-notation paths to sensitive data
   * @param maskValue - Value to replace sensitive data with
   * @returns Sanitized data
   */
  public static sanitizeByPaths<T extends Record<string, unknown>>(
    data: T,
    paths: string[],
    maskValue: string = this.defaultSanitizationParams.maskValue || "********"
  ): T {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return data;
    }

    // Create a deep copy to avoid mutations
    const result = JSON.parse(JSON.stringify(data)) as T;

    for (const path of paths) {
      const parts = path.split(".");
      let current: Record<string, unknown> = result;
      let reachedEnd = true;

      // Navigate to the parent object
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (
          current[part] === undefined ||
          current[part] === null ||
          typeof current[part] !== "object"
        ) {
          reachedEnd = false;
          break;
        }
        current = current[part] as Record<string, unknown>;
      }

      // Set the value if we can reach it
      const lastPart = parts[parts.length - 1];
      if (reachedEnd && lastPart in current) {
        current[lastPart] = maskValue;
      }
    }

    return result;
  }

  /**
   * Sanitize headers to remove sensitive information
   * Uses default SanitizationConfig parameters
   */
  public static sanitizeHeaders(headers: unknown): Record<string, unknown> {
    if (!headers || typeof headers !== "object") {
      return {};
    }

    // Use default sanitization parameters which already include header sensitive keys
    return SanitizationConfig.sanitizeData(headers as Record<string, unknown>);
  }

  /**
   * Sanitizes string values by removing potentially dangerous characters.
   * Can be used for credentials, URLs, or any string that needs sanitization.
   *
   * @param value The string value to sanitize
   * @returns A sanitized string with potentially dangerous characters removed
   */
  public static sanitizeString(value: string): string {
    if (!value) return "";

    // Remove quotes, backslashes, angle brackets, and trim whitespace
    return value.replace(/["'\\<>]/g, "").trim();
  }

  /**
   * Creates a sanitization function that can be used with Winston logger
   * @returns A function that sanitizes objects for logging
   */
  public static createLogSanitizer(): (
    info: Record<string, unknown>
  ) => Record<string, unknown> {
    return (info: Record<string, unknown>) => this.sanitizeData(info);
  }
}