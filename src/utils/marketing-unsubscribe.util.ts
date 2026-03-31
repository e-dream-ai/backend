import jwt from "jsonwebtoken";
import env from "shared/env";

const TOKEN_TTL = "30d";

export const createUnsubscribeToken = ({
  userId,
  email,
}: {
  userId: number;
  email: string;
}): string =>
  jwt.sign({ userId, email }, env.MARKETING_UNSUBSCRIBE_SECRET, {
    expiresIn: TOKEN_TTL,
  });

export const verifyUnsubscribeToken = (token: string) => {
  try {
    const payload = jwt.verify(token, env.MARKETING_UNSUBSCRIBE_SECRET) as {
      userId: number;
      email: string;
    };
    return { valid: true, payload } as const;
  } catch {
    return { valid: false } as const;
  }
};
