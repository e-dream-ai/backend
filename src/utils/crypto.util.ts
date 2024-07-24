import crypto from "crypto";

export const generateSecret = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};
