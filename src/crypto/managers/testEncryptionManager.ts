import CryptoOperationsManager from "../core/cryptoOperationsManager";
import ErrorHandler from "../../utils/errors/errorHandler";

export default class TestEncryptionManager {
  private cryptoOperationsManager: CryptoOperationsManager;

  constructor() {
    this.cryptoOperationsManager = new CryptoOperationsManager();
  }

  public async createAndSaveSecretKey(keyName: string) {
    try {
      // Call the generateSecretKey method to generate a secret key
      const secretKey = this.cryptoOperationsManager.generateSecretKey();

      if (secretKey === undefined || secretKey === null) {
        ErrorHandler.logAndThrow(
          "Failed to generate secret key: Secret key cannot be null or undefined",
          "createAndSaveSecretKey"
        );
      }

      // Assuming there is a method to store the secret key
      await this.cryptoOperationsManager.storeSecretKeyInEnvironmentFile(
        keyName,
        secretKey
      );
    } catch (error) {
      ErrorHandler.captureError(
        error,
        "createAndSaveSecretKey",
        "Failed to create and save secret key"
      );
      throw error;
    }
  }

  /**
   * Encrypts environment variables for a specified environment using a provided secret key.
   *
   * This method initializes the encryption process by setting the environment file path and
   * deriving the secret key. Then, it encrypts the environment variables and stores them in
   * the environment file. If an error occurs during the encryption process, logs the error
   * and throws an exception.
   *
   * @param env - The name of the environment to encrypt variables for.
   * @param secretKey - The secret key used for key derivation and encryption.
   * @throws {Error} If an error occurs during the encryption process.
   */
  public async encryptEnvironmentVariables(
    envFilePath: string,
    secretKeyVariable: string,
    envVariables?: string[]
  ) {
    try {
      // Initialize encryption
      await this.cryptoOperationsManager.initializeEncryption(
        envFilePath,
        secretKeyVariable
      );

      // Encrypt environment variables
      await this.cryptoOperationsManager.encryptEnvVariables(envVariables);
    } catch (error) {
      ErrorHandler.captureError(
        error,
        "encryptEnvironmentVariables",
        "Failed to encrypt environment variables"
      );
      throw error;
    }
  }
}
