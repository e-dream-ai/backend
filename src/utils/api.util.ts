import {
  ALLOWED_DOMAIN_PATTERNS,
  // CLIENT_TYPES,
  ORIGINS,
} from "constants/api.constants";
import { IncomingHttpHeaders } from "http";

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

export function getRequestContext(headers: IncomingHttpHeaders) {
  const userAgent: string | undefined = headers["user-agent"];

  const version: string | undefined =
    ((headers["edream-client-version"] ||
      headers["e-dream-client-version"]) as string) ?? "unknown";

  const type: string =
    (
      (headers["edream-client-type"] ||
        headers["e-dream-client-type"]) as string
    )?.toLowerCase() ?? "web";

  // if (!clientVersion || !clientType) {
  //   throw new Error("Missing client version or type.");
  // }

  // if (!Object.values(CLIENT_TYPES).includes(clientType)) {
  //   throw new Error(
  //     `Invalid client type. Allowed types: ${Object.values(CLIENT_TYPES).join(
  //       ", ",
  //     )}`,
  //   );
  // }

  return {
    type,
    version,
    userAgent,
  };
}
