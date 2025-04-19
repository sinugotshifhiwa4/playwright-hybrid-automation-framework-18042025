import environmentConfigManager from "./environmentConfigLoader";
import ErrorHandler from "../errors/errorHandler";

/**
 * Initializes the global environment configuration by calling GlobalEnvConfig.initEnvConfiguration().
 * If any error occurs during the setup process, logs the error and throws an exception.
 * @returns {Promise<void>} A promise that resolves when the setup is complete.
 */
async function globalSetup(): Promise<void> {
  try {
    await environmentConfigManager.initialize();
  } catch (error) {
    ErrorHandler.captureError(
      error,
      "globalSetup",
      "Failed to set up environment variables"
    );
    throw error;
  }
}

export default globalSetup;
