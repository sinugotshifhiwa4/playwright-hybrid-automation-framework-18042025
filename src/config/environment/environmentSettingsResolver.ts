import CryptoService from "../../crypto/services/cryptoOperations";
import { UserCredentials } from "../../models/interfaces/userCredentialsParams";
import { EnvironmentSecretKeys } from "./environmentFilePaths";
import { CIEnvironmentVariables } from "../../models/interfaces/ciEnvironmentVariables";
import SanitizationConfig from "../../utils/sanitization/dataSanitizer";
import ErrorHandler from "../../utils/errors/errorHandler";
import ENV from "../../utils/environment/environmentVariables";

export default class EnvironmentSettingsResolver {
  // Store CI credentials from environment variables
  private readonly ciEnvironmentVariables: CIEnvironmentVariables = {
    portalBaseUrl: process.env.CI_PORTAL_BASE_URL ?? "",
    apiBaseUrl: process.env.CI_API_BASE_URL ?? "",
    username: process.env.CI_PORTAL_USERNAME ?? "",
    password: process.env.CI_PORTAL_PASSWORD ?? "",
  };

  /**
   * Retrieves the base URL for the portal from the CI environment variables.
   */
  public async getCIPortalBaseUrl(): Promise<string> {
    return this.getEnvironmentVariable(
      () => this.ciEnvironmentVariables.portalBaseUrl,
      "CI_PORTAL_BASE_URL",
      "retrievePortalBaseUrl",
      "Failed to retrieve portal base URL"
    );
  }

  /**
   * Retrieves the base URL for the portal from local environment variables.
   */
  public async getLocalPortalBaseUrl(): Promise<string> {
    return this.getEnvironmentVariable(
      () => ENV.PORTAL_URL,
      "PORTAL_URL",
      "retrieveLocalPortalBaseUrl",
      "Failed to retrieve local portal base URL",
      false
    );
  }

  /**
   * Retrieves the base URL for the API from the CI environment variables.
   */
  public async getCIApiBaseUrl(): Promise<string> {
    return this.getEnvironmentVariable(
      () => this.ciEnvironmentVariables.apiBaseUrl,
      "CI_API_BASE_URL",
      "retrieveApiBaseUrl",
      "Failed to retrieve API base URL"
    );
  }

  /**
   * Retrieves the base URL for the API from local environment variables.
   */
  public async getLocalApiBaseUrl(): Promise<string> {
    return this.getEnvironmentVariable(
      () => ENV.API_BASE_URL,
      "API_URL",
      "retrieveLocalApiBaseUrl",
      "Failed to retrieve local API base URL",
      false
    );
  }

  /**
   * Retrieves the user credentials from the CI environment variables.
   */
  public async getCICredentials(): Promise<UserCredentials> {
    try {
      const credentials = {
        username: SanitizationConfig.sanitizeString(
          this.ciEnvironmentVariables.username
        ),
        password: SanitizationConfig.sanitizeString(
          this.ciEnvironmentVariables.password
        ),
      };
      this.verifyCredentials(credentials);
      return credentials;
    } catch (error) {
      ErrorHandler.captureError(
        error,
        "retrieveCiEnvironmentVariables",
        "Failed to retrieve CI credentials"
      );
      throw error;
    }
  }

  /**
   * Retrieves the user credentials from the local environment variables.
   */
  public async getLocalCredentials(): Promise<UserCredentials> {
    try {
      const credentials = await this.decryptCredentials(
        ENV.PORTAL_USERNAME,
        ENV.PORTAL_PASSWORD,
        EnvironmentSecretKeys.UAT
      );
      this.verifyCredentials(credentials);
      return credentials;
    } catch (error) {
      ErrorHandler.captureError(
        error,
        "retrieveLocalCredentials",
        "Failed to retrieve local credentials"
      );
      throw error;
    }
  }

  /**
   * Decrypts the given encrypted username and password using the provided secret key.
   */
  public async decryptCredentials(
    username: string,
    password: string,
    secretKey: string
  ): Promise<UserCredentials> {
    try {
      return {
        username: await CryptoService.decrypt(username, secretKey),
        password: await CryptoService.decrypt(password, secretKey),
      };
    } catch (error) {
      ErrorHandler.captureError(
        error,
        "decryptCredentials",
        "Failed to decrypt credentials"
      );
      throw error;
    }
  }

  /**
   * Verifies that the provided credentials contain both a username and password.
   */
  public verifyCredentials(credentials: UserCredentials): void {
    if (!credentials.username || !credentials.password) {
      ErrorHandler.logAndThrow(
        "Invalid credentials: Missing username or password.",
        "EnvironmentVariablesManager"
      );
    }
  }

  /**
   * Validates that an environment variable is not empty.
   */
  private validateEnvironmentVariable(
    value: string,
    variableName: string
  ): void {
    if (!value || value.trim() === "") {
      throw new Error(
        `Environment variable ${variableName} is not set or is empty`
      );
    }
  }

  /**
   * Generic method to retrieve and validate environment variables
   * @param getValue - Function that returns the environment variable value
   * @param variableName - Name of the environment variable for error reporting
   * @param methodName - Calling method name for error tracking
   * @param errorMessage - Error message for failures
   * @param sanitize - Whether to sanitize the output string
   */
  private async getEnvironmentVariable(
    getValue: () => string,
    variableName: string,
    methodName: string,
    errorMessage: string,
    sanitize: boolean = true
  ): Promise<string> {
    try {
      const value = getValue();
      this.validateEnvironmentVariable(value, variableName);
      return sanitize ? SanitizationConfig.sanitizeString(value) : value;
    } catch (error) {
      ErrorHandler.captureError(error, methodName, errorMessage);
      throw error;
    }
  }
}
