import { ALLOWED_DOMAIN_PATTERNS, ORIGINS } from "constants/api.constants";

export function handleCustomOrigin(
  origin: string | undefined,
  callback: (err: Error | null, success?: boolean) => void,
) {
  // Allow requests with no origin (like mobile apps or curl requests)
  if (!origin) return callback(null, true);

  // Check if the origin is in the list of additional origins
  if (ORIGINS.includes(origin)) {
    return callback(null, true);
  }

  // Check if the origin matches any of the allowed domain patterns
  const isAllowedDomain = ALLOWED_DOMAIN_PATTERNS.some((pattern) =>
    pattern.test(origin),
  );

  if (isAllowedDomain) {
    callback(null, true);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
}
