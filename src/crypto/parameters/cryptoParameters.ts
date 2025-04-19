interface ByteLengths {
  IV: number;
  WEB_CRYPTO_IV: number;
  SALT: number;
  SECRET_KEY: number;
}

interface Argon2Parameters {
  MEMORY_COST: number;
  TIME_COST: number;
  PARALLELISM: number;
}

interface CryptoConfig {
  BYTE_LENGTHS: ByteLengths;
  ARGON2_PARAMETERS: Argon2Parameters;
}

export const CRYPTO_CONFIG: CryptoConfig = {
  BYTE_LENGTHS: {
    IV: 16,
    WEB_CRYPTO_IV: 12,
    SALT: 32,
    SECRET_KEY: 32,
  },
  ARGON2_PARAMETERS: {
    MEMORY_COST: 262144, // 131072 => 128 MB and 262144KB => 256 MB
    TIME_COST: 4,
    PARALLELISM: 3,
  },
};
