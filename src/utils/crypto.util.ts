import crypto from "crypto";
import env from "shared/env";

const CIPHER_KEY = env.CIPHER_KEY;
const algorithm = "aes-256-cbc";

export const generateSecret = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

// Encryption function
export const encrypt = (text: string): { iv: string; content: string } => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, CIPHER_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { iv: iv.toString("hex"), content: encrypted.toString("hex") };
};

// Decryption function
export const decrypt = (hash: { iv: string; content: string }): string => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    CIPHER_KEY,
    Buffer.from(hash.iv, "hex"),
  );
  let decrypted = decipher.update(Buffer.from(hash.content, "hex"));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

export const hashApiKey = (apiKey: string): string => {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
};
