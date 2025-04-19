/**
 * Returns the path to the authentication state file.
 * In CI mode, the file is at `.auth/ci-login.json`.
 * In local mode, the file is at `.auth/local-login.json`.
 * @returns The path to the authentication state file.
 */
export function getAuthStoragePath(): string {
  return process.env.CI ? `.auth/ci-login.json` : `.auth/local-login.json`;
}
