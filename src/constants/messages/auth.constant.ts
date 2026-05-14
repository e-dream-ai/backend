export const AUTH_MESSAGES = {
  USER_NOT_FOUND: "User not found.",
  USER_CREATED: "User created successfully.",
  USER_VERIFIED: "User verified successfully.",
  USER_LOGGED_IN: "User logged in successfully.",
  USER_LOGGED_OUT: "User logged out successfully.",
  USER_ALREADY_EXISTS: "User already exists.",
  USER_PASSWORD_CHANGED: "User password changed successfully.",
  USER_NOT_CONFIRMED:
    "User is not confirmed, check your email to verify account.",
  AUTHENTICATION_FAILED: "Authentication failed.",
  INVALID_SIGNATURE: "Invalid signature.",
  INVALID_PARAMETERS: "Invalid parameters provided.",
  INVALID_API_KEY: "Invalid apikey.",
  INVALID_CREDENTIALS: "Invalid credentials provided.",
  INVALID_INVITE: "Invalid invite code.",
  INVALID_TOKEN: "Invalid token.",
  EXPIRED_TOKEN: "Expired token.",
  JWT_ERROR: "JWT error.",
  TOO_MANY_REQUESTS: "Too many requests, please try, again later.",
  UNEXPECTED_ERROR: "An unexpected error occurred.",
  CODE_MISMATCH: "Invalid verification code provided.",
  EXPIRED_CODE: "Invalid code provided, please request a code again.",
  RATE_LIMIT_EXCEEDED:
    "Too many verification attempts. Please wait a moment and try again.",
  CODE_LOCKED_OUT:
    "This verification code has been locked after too many incorrect attempts. Please request a new code.",
  PASSWORD_RESET_CREATED:
    "Password reset created, wait for email instructions.",
  PASSWORD_RESET_REQUIRED: "Password reset required.",
  FORGOT_PASSWORD_REQUEST: "Forgot password request successfully created.",
  NOT_AUTHORIZED: "Not authorized.",
  SENT_CODE_TO_EMAIL: "Sent an authorization code to your email.",
};

export const SOCKET_AUTH_ERROR_MESSAGES = {
  UNAUTHORIZED: "UNAUTHORIZED",
};

/**
 * Machine-readable error codes for auth failures.
 *
 * Returned as `errorCode` in 4xx responses from the auth endpoints so that
 * clients can react programmatically without string-matching human-readable
 * messages. Refresh-specific codes map to WorkOS `RefreshSessionFailureReason`;
 * magic-link-specific codes map to WorkOS SDK exception types.
 */
export const AUTH_ERROR_CODES = {
  /** The session has expired or been revoked (WorkOS: INVALID_GRANT). */
  SESSION_EXPIRED: "SESSION_EXPIRED",
  /** The session cookie is present but corrupt or tampered (WorkOS: INVALID_SESSION_COOKIE). */
  SESSION_INVALID: "SESSION_INVALID",
  /** No session cookie was included in the request (WorkOS: NO_SESSION_COOKIE_PROVIDED). */
  NO_SESSION: "NO_SESSION",
  /** The user must complete MFA enrolment before the session can be refreshed (WorkOS: MFA_ENROLLMENT). */
  MFA_ENROLLMENT_REQUIRED: "MFA_ENROLLMENT_REQUIRED",
  /** The user's organisation requires SSO; the current session cannot be refreshed (WorkOS: SSO_REQUIRED). */
  SSO_REQUIRED: "SSO_REQUIRED",
  RATE_LIMITED: "RATE_LIMITED",
  /** The magic-link code was wrong or could not be matched to the email. */
  INVALID_CODE: "INVALID_CODE",
  /** The magic-link code has expired; the user must request a new one. */
  CODE_EXPIRED: "CODE_EXPIRED",
  CODE_LOCKED_OUT: "CODE_LOCKED_OUT",
  /** No WorkOS user exists for the supplied email. */
  USER_NOT_FOUND: "USER_NOT_FOUND",
  /** The request was malformed (e.g. missing/invalid email). */
  BAD_REQUEST: "BAD_REQUEST",
  /** An unexpected failure reason was returned; clients should treat this as a transient error. */
  UNKNOWN: "UNKNOWN",
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];
