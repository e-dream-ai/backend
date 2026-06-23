import crypto from "crypto";
import env from "shared/env";

const CIPHER_KEY = env.CIPHER_KEY;
const CIPHER_ALGORITHM = "aes-256-cbc";

const GCM_ALGORITHM = "aes-256-gcm";
const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

let gcmKey: Buffer | null = null;
const getGcmKey = (): Buffer => {
  if (gcmKey) return gcmKey;
  const key = Buffer.from(env.SECRET_CIPHER_KEY, "hex");
  if (key.length !== 32) {
    throw new Error(
      "SECRET_CIPHER_KEY must be 32 bytes (64 hex chars). Generate with `openssl rand -hex 32`.",
    );
  }
  gcmKey = key;
  return gcmKey;
};

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

export const encryptSecret = (text: string): string => {
  const iv = crypto.randomBytes(GCM_IV_BYTES);
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, getGcmKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    ciphertext.toString("hex"),
  ].join(":");
};

export const decryptSecret = (blob: string): string => {
  const [ivHex, tagHex, contentHex] = blob.split(":");
  if (!ivHex || !tagHex || !contentHex) {
    throw new Error("Malformed encrypted secret");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  if (iv.length !== GCM_IV_BYTES || authTag.length !== GCM_TAG_BYTES) {
    throw new Error("Invalid IV or auth tag length");
  }
  const decipher = crypto.createDecipheriv(GCM_ALGORITHM, getGcmKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(contentHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};

/**
 * Generates hash api key value
 * @param apiKey
 * @returns hash api key value
 */
export const hashApiKey = (apiKey: string): string => {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
};
