import environmentDetector from "../config/environment/environmentDetector";
import fs from "fs";
import path from "path";
import { FileEncoding } from "../models/enums/fileEncodingParams";
import ErrorHandler from "../utils/errors/errorHandler";
import logger from "./logging/loggerManager";

export default class FileManager {
  public static async writeFile(
    filePath: string,
    content: string,
    keyName: string,
    encoding: FileEncoding = FileEncoding.UTF8
  ): Promise<void> {
    this.validatePath(filePath, "filePath");

    if (!content) {
      logger.warn(`No content provided for file: ${keyName}`);
      throw new Error(`No content provided for file: ${keyName}`);
    }

    try {
      // Ensure the directory exists before writing
      const dirPath = path.dirname(filePath);
      await this.ensureDirectoryExists(dirPath);

      await fs.promises.writeFile(filePath, content, { encoding });
    } catch (error) {
      if (error instanceof Error && "code" in error) {
        if (error.code === "EISDIR") {
          throw new Error(`Cannot write to a directory: ${filePath}`);
        }
        if (error.code === "ENOENT") {
          throw new Error(
            `Parent directory does not exist: ${path.dirname(filePath)}`
          );
        }
      }
      throw ErrorHandler.captureError(
        error,
        "writeFile",
        `Failed to write file: ${filePath}`
      );
    }
  }

  public static async readFile(
    filePath: string,
    encoding: FileEncoding = FileEncoding.UTF8
  ): Promise<string> {
    this.validatePath(filePath, "filePath");

    try {
      const content = await fs.promises.readFile(filePath, { encoding });
      logger.info(
        `Successfully loaded file: ${this.getRelativePath(filePath)}`
      );
      return content.toString();
    } catch (error) {
      if (error instanceof Error && "code" in error) {
        if (error.code === "EISDIR") {
          throw new Error(`Cannot read a directory as a file: ${filePath}`);
        }
        if (error.code === "ENOENT") {
          throw new Error(`File does not exist: ${filePath}`);
        }
      }
      throw ErrorHandler.captureError(
        error,
        "readFile",
        `Failed to read file: ${filePath}`
      );
    }
  }
  /**
   * Checks if a directory exists at the given path.
   *
   * @param dirPath - The directory path to check.
   * @returns {Promise<boolean>} A promise that resolves to true if the directory exists, false otherwise.
   */
  public static async doesDirectoryExist(dirPath: string): Promise<boolean> {
    this.validatePath(dirPath, "dirPath");

    // Skip checks in CI environment
    if (environmentDetector.isRunningInCIEnvironment()) {
      return false;
    }

    try {
      const stats = await fs.promises.stat(dirPath);
      return stats.isDirectory();
    } catch {
      const relativePath = path.relative(process.cwd(), dirPath);
      logger.warn(`Directory does not exist: ${relativePath}`);
      return false;
    }
  }

  /**
   * Checks if a directory exists at the given path (synchronous version).
   *
   * @param dirPath - The directory path to check.
   * @returns {boolean} True if the directory exists, false otherwise.
   */
  public static doesDirectoryExistSync(dirPath: string): boolean {
    this.validatePath(dirPath, "dirPath");

    // Skip checks in CI environment
    if (environmentDetector.isRunningInCIEnvironment()) {
      return false;
    }

    try {
      const stats = fs.statSync(dirPath);
      return stats.isDirectory();
    } catch {
      const relativePath = path.relative(process.cwd(), dirPath);
      logger.warn(`Directory does not exist: ${relativePath}`);
      return false;
    }
  }

  /**
   * Checks if a file exists at the given path.
   *
   * @param filePath - The file path to check.
   * @returns {Promise<boolean>} A promise that resolves to true if the file exists, false otherwise.
   */
  public static async doesFileExist(filePath: string): Promise<boolean> {
    this.validatePath(filePath, "filePath");

    // Skip checks in CI environment
    if (environmentDetector.isRunningInCIEnvironment()) {
      return false;
    }

    try {
      const stats = await fs.promises.stat(filePath);
      return stats.isFile();
    } catch {
      const baseName = path.basename(filePath);
      logger.warn(`File does not exist: ${baseName}`);
      return false;
    }
  }

  /**
   * Checks if a file exists at the given path (synchronous version).
   *
   * @param filePath - The file path to check.
   * @returns {boolean} True if the file exists, false otherwise.
   */
  public static doesFileExistSync(filePath: string): boolean {
    this.validatePath(filePath, "filePath");

    // Skip checks in CI environment
    if (environmentDetector.isRunningInCIEnvironment()) {
      return false;
    }

    try {
      const stats = fs.statSync(filePath);
      return stats.isFile();
    } catch {
      const baseName = path.basename(filePath);
      logger.warn(`File does not exist: ${baseName}`);
      return false;
    }
  }

  /**
   * Ensures that a directory exists at the given path. If the directory does not exist, creates it.
   * If the directory already exists, does nothing.
   *
   * @param dirPath - The file system path where the directory should exist.
   * @returns {Promise<void>} A promise that resolves when the operation completes.
   * @throws Will throw an error if there is an issue creating the directory.
   */
  public static async ensureDirectoryExists(dirPath: string): Promise<void> {
    this.validatePath(dirPath, "dirPath");

    // Skip checks in CI environment
    if (environmentDetector.isRunningInCIEnvironment()) {
      return;
    }

    try {
      // Use recursive option to create directory and all parent directories if they don't exist
      // This will do nothing if the directory already exists
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw ErrorHandler.captureError(
        error,
        "ensureDirectoryExists",
        `Failed to create directory: ${dirPath}`
      );
    }
  }

  /**
   * Ensures that a file exists at the given path. If the file does not exist, creates it.
   * If the file already exists, does nothing.
   *
   * @param filePath - The file system path where the file should exist.
   * @returns {Promise<void>} A promise that resolves when the operation completes.
   * @throws Will throw an error if there is an issue creating the file.
   */
  public static async ensureFileExists(filePath: string): Promise<void> {
    this.validatePath(filePath, "filePath");

    // Skip checks in CI environment
    if (environmentDetector.isRunningInCIEnvironment()) {
      return;
    }

    try {
      // Ensure the directory exists first
      const dirPath = path.dirname(filePath);
      await this.ensureDirectoryExists(dirPath);

      // Try to open the file in 'a' (append) mode, which will create it if it doesn't exist
      // and do nothing if it does exist
      const fileHandle = await fs.promises.open(filePath, "a");
      await fileHandle.close();
    } catch (error) {
      throw ErrorHandler.captureError(
        error,
        "ensureFileExists",
        `Failed to create file: ${filePath}`
      );
    }
  }

  /**
   * Ensures that a directory exists at the given path (synchronous version).
   * If the directory does not exist, creates it. If the directory already exists, does nothing.
   *
   * @param dirPath - The file system path where the directory should exist.
   * @throws Will throw an error if there is an issue creating the directory.
   */
  public static ensureDirectoryExistsSync(dirPath: string): void {
    this.validatePath(dirPath, "dirPath");

    // Skip checks in CI environment
    if (environmentDetector.isRunningInCIEnvironment()) {
      return;
    }

    try {
      // Use recursive option to create directory and all parent directories if they don't exist
      // This will do nothing if the directory already exists
      fs.mkdirSync(dirPath, { recursive: true });
    } catch (error) {
      throw ErrorHandler.captureError(
        error,
        "ensureDirectoryExistsSync",
        `Failed to create directory: ${dirPath}`
      );
    }
  }

  public static ensureFileExistsSync(filePath: string): void {
    this.validatePath(filePath, "filePath");

    // Skip checks in CI environment
    if (environmentDetector.isRunningInCIEnvironment()) {
      return;
    }

    try {
      // Ensure the parent directory exists first
      const dirPath = path.dirname(filePath);
      this.ensureDirectoryExistsSync(dirPath);

      // Open the file in append mode (creates if it doesn't exist)
      fs.writeFileSync(filePath, "", {
        encoding: FileEncoding.UTF8,
        flag: "a",
      });
    } catch (error) {
      throw ErrorHandler.captureError(
        error,
        "ensureFileExistsSync",
        `Failed to create file: ${filePath}`
      );
    }
  }

  /**
   * Returns the resolved absolute directory path by combining the given directory path and the current working directory.
   *
   * @param dirPath - The directory path to use for constructing the absolute directory path.
   * @returns {string} The resolved absolute directory path.
   * @throws Will throw an error if an error occurs during directory path construction.
   */
  public static getDirPath(dirPath: string): string {
    try {
      this.validatePath(dirPath, "dirPath");
      return path.resolve(process.cwd(), dirPath);
    } catch (error) {
      throw ErrorHandler.captureError(
        error,
        "getDirPath",
        `Failed to resolve directory path: ${dirPath}`
      );
    }
  }

  /**
   * Returns the resolved file path by combining the given directory path and file name.
   * Validates the inputs and throws an error if either is invalid.
   *
   * @param dirPath - The directory path to use for constructing the file path.
   * @param fileName - The file name to use for constructing the file path.
   * @returns {string} The resolved file path.
   * @throws Will throw an error if the inputs are invalid or if an error occurs during file path construction.
   */
  public static getFilePath(dirPath: string, fileName: string): string {
    try {
      this.validatePath(dirPath, "dirPath");
      this.validatePath(fileName, "fileName");

      // Get directory path
      const fullDirPath = this.getDirPath(dirPath);

      // Join the directory path and file name
      return path.join(fullDirPath, fileName);
    } catch (error) {
      throw ErrorHandler.captureError(
        error,
        "getFilePath",
        `Failed to construct file path for dirPath: '${dirPath}', fileName: '${fileName}'`
      );
    }
  }

  public static async isDirectory(path: string): Promise<boolean> {
    this.validatePath(path, "path");

    try {
      const stats = await fs.promises.stat(path);
      return stats.isDirectory();
    } catch {
      logger.warn(`Path does not exist: ${path}`);
      return false;
    }
  }

  public static isDirectorySync(path: string): boolean {
    this.validatePath(path, "path");

    try {
      const stats = fs.statSync(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  public static async listFiles(dirPath: string): Promise<string[]> {
    this.validatePath(dirPath, "dirPath");

    try {
      const files = await fs.promises.readdir(dirPath);
      return files;
    } catch (error) {
      throw ErrorHandler.captureError(
        error,
        "listFiles",
        `Failed to list files in directory: ${dirPath}`
      );
    }
  }

  /**
   * Removes a file if it exists.
   *
   * @param filePath - The path to the file to remove.
   * @returns {Promise<boolean>} A promise that resolves to true if the file was removed, false if it didn't exist.
   * @throws Will throw an error if there is an issue removing the file.
   */
  public static async removeFile(filePath: string): Promise<boolean> {
    this.validatePath(filePath, "filePath");

    // Skip operations in CI environment
    if (environmentDetector.isRunningInCIEnvironment()) {
      return false;
    }

    try {
      await fs.promises.unlink(filePath);
      logger.info(`Removed file: ${this.getRelativePath(filePath)}`);
      return true;
    } catch (error) {
      // Check if the error is because the file doesn't exist
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        logger.error(`File does not exist for removal: ${filePath}`);
        return false;
      }

      throw ErrorHandler.captureError(
        error,
        "removeFile",
        `Failed to remove file: ${filePath}`
      );
    }
  }

  /**
   * Removes a file if it exists (synchronous version).
   *
   * @param filePath - The path to the file to remove.
   * @returns {boolean} True if the file was removed, false if it didn't exist.
   * @throws Will throw an error if there is an issue removing the file.
   */
  public static removeFileSync(filePath: string): boolean {
    this.validatePath(filePath, "filePath");

    // Skip operations in CI environment
    if (environmentDetector.isRunningInCIEnvironment()) {
      return false;
    }

    try {
      fs.unlinkSync(filePath);
      logger.info(`Removed file: ${this.getRelativePath(filePath)}`);
      return true;
    } catch (error) {
      // Check if the error is because the file doesn't exist
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        logger.warn(`File does not exist for removal: ${filePath}`);
        return false;
      }

      throw ErrorHandler.captureError(
        error,
        "removeFileSync",
        `Failed to remove file: ${filePath}`
      );
    }
  }

  public static async removeDirectory(dirPath: string): Promise<void> {
    this.validatePath(dirPath, "dirPath");

    // Skip operations in CI environment
    if (environmentDetector.isRunningInCIEnvironment()) {
      logger.warn(`Skipping directory removal in CI environment: ${dirPath}`);
      return;
    }

    try {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
      logger.info(`Removed directory: ${this.getRelativePath(dirPath)}`);
    } catch (error) {
      throw ErrorHandler.captureError(
        error,
        "removeDirectory",
        `Failed to remove directory: ${dirPath}`
      );
    }
  }

  private static validatePath(filePath: string, paramName: string): void {
    if (!filePath) {
      const message = `Invalid arguments: '${paramName}' is required.`;
      ErrorHandler.logAndThrow(message, "validatePath");
    }

    // Ensure file paths do not end with a directory separator
    if (
      paramName === "filePath" &&
      (filePath.endsWith("/") || filePath.endsWith("\\"))
    ) {
      const message = `Invalid file path: '${filePath}' cannot end with a directory separator.`;
      ErrorHandler.logAndThrow(message, "validatePath");
    }
  }

  /**
   * Gets a relative path from the current working directory.
   *
   * @param absolutePath - The absolute path to convert to relative.
   * @returns {string} The relative path from current working directory.
   */
  public static getRelativePath(absolutePath: string): string {
    return path.relative(process.cwd(), absolutePath);
  }
}
