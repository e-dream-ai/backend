import crypto from "crypto";
import env from "shared/env";

const CIPHER_KEY = env.CIPHER_KEY;
const CIPHER_ALGORITHM = "aes-256-cbc";

export const generateSecret = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Encrypts given text string using AES encryption (defined on CIPHER_ALGORITHM) with a provided initialization vector (iv)
 * @param text
 * @returns object
 *   - `iv`: initialization vector used for encryption, encoded in hexadecimal format
 *   - `content`: encrypted content of the input text, encoded in hexadecimal format
 *
 */
export const encrypt = (text: string): { iv: string; content: string } => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, CIPHER_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { iv: iv.toString("hex"), content: encrypted.toString("hex") };
};

/**
 * Decrypts a given encrypted object using AES decryption with (defined on CIPHER_ALGORITHM) the specified initialization vector (iv) and key
 * @param hash - object
 *   - `iv`: initialization vector used for encryption, encoded in hexadecimal format
 *   - `content`: encrypted content of the input text, encoded in hexadecimal format
 * @returns decrypted plaintext string
 */
export const decrypt = (hash: { iv: string; content: string }): string => {
  const decipher = crypto.createDecipheriv(
    CIPHER_ALGORITHM,
    CIPHER_KEY,
    Buffer.from(hash.iv, "hex"),
  );
  let decrypted = decipher.update(Buffer.from(hash.content, "hex"));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

/**
 * Generates hash api key value
 * @param apiKey
 * @returns hash api key value
 */
export const hashApiKey = (apiKey: string): string => {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
};
