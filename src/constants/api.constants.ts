import env from "shared/env";

export enum ContentType {
  json = "json",
  none = "none",
}

export const CONTENT_TYPES = {
  [ContentType.json]: "application/json; charset=UTF-8",
  [ContentType.none]: "",
};

export const getRequestHeaders = ({
  contentType = ContentType.none,
}: {
  contentType?: ContentType;
}) => {
  let contentTypeHeader = {};

  if (contentType !== ContentType.none) {
    contentTypeHeader = { "Content-type": CONTENT_TYPES[contentType] };
  }
  return {
    ...contentTypeHeader,
    "Access-Control-Allow-Origin": "*",
  };
};

export const ALLOWED_METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

export const ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "Access-Control-Allow-Origin",
  "Access-Control-Allow-Credentials",
  "E-Dream-Client-Type",
  "Edream-Client-Type",
  "E-Dream-Client-Version",
  "Edream-Client-Version",
];

/**
 * Allowed origin values
 */
export const ALLOWED_DOMAIN_PATTERNS = [
  /^http:\/\/localhost(:\d+)?\/?$/,
  /^https:\/\/.*\.netlify\.app\/?$/,
  /^https:\/\/.*\.e-dream\.ai\/?$/,
];

export const ORIGINS = [
  env.FRONTEND_URL,
  // Add any other specific origins here
];

export const CLIENT_TYPES = {
  WEB: "web",
  DESKTOP: "desktop",
  REACT: "react",
};
