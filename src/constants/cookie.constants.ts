import { CookieOptions } from "express";
import env from "shared/env";

const IS_DEVELOPMENT = env.NODE_ENV === "development";

export const WORKOS_SESSION_COOKIE = "wos-session";

export const workOSCookieConfig: CookieOptions = {
  httpOnly: true,
  secure: !IS_DEVELOPMENT,
  sameSite: "lax" as const,
  maxAge: 365 * 24 * 60 * 60 * 1000,
};
