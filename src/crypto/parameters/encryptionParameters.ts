/**
 * Represents the parameters required for encryption.
 */
export interface EncryptionParameters {
  salt: string;
  iv: string;
  cipherText: string;
}
