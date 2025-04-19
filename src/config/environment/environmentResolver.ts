import { UserCredentials } from "../../models/interfaces/userCredentialsParams";
import EnvironmentSettingsResolver from "./environmentSettingsResolver";
import EnvironmentDetector from "./environmentDetector";
import ErrorHandler from "../../utils/errors/errorHandler";

export default class EnvironmentResolver {
  private environmentSettingsResolver: EnvironmentSettingsResolver;

  constructor(
    environmentSettingsResolver: EnvironmentSettingsResolver = new EnvironmentSettingsResolver()
  ) {
    this.environmentSettingsResolver = environmentSettingsResolver;
  }

  public async getPortalBaseUrl(): Promise<string> {
    return this.getEnvironmentValue(
      () => this.environmentSettingsResolver.getCIPortalBaseUrl(),
      () => this.environmentSettingsResolver.getLocalPortalBaseUrl(),
      "fetchPortalBaseUrl",
      "Failed to fetch portal base URL"
    );
  }

  public async getApiBaseUrl(): Promise<string> {
    return this.getEnvironmentValue(
      () => this.environmentSettingsResolver.getCIApiBaseUrl(),
      () => this.environmentSettingsResolver.getLocalApiBaseUrl(),
      "fetchApiBaseUrl",
      "Failed to fetch API base URL"
    );
  }

  public async getCredentials(): Promise<UserCredentials> {
    return this.getEnvironmentValue(
      () => this.environmentSettingsResolver.getCICredentials(),
      () => this.environmentSettingsResolver.getLocalCredentials(),
      "fetchCredentials",
      "Failed to fetch credentials"
    );
  }

  /**
   * Generic method to fetch environment variables based on environment
   * @param ciMethod - Method to call in CI environment
   * @param localMethod - Method to call in local environment
   * @param methodName - Name of the calling method for error tracking
   * @param errorMessage - Error message for failures
   */
  private async getEnvironmentValue<T>(
    ciMethod: () => Promise<T>,
    localMethod: () => Promise<T>,
    methodName: string,
    errorMessage: string
  ): Promise<T> {
    try {
      return await (EnvironmentDetector.isRunningInCIEnvironment()
        ? ciMethod()
        : localMethod());
    } catch (error) {
      ErrorHandler.captureError(error, methodName, errorMessage);
      throw error;
    }
  }
}
