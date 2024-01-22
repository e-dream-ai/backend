import { RequestType } from "types/express.types";

export const isBrowserRequest = (req: RequestType): boolean => {
  const userAgent = req.get("User-Agent");

  if (userAgent) {
    const isBrowser =
      userAgent.includes("Mozilla") ||
      userAgent.includes("Chrome") ||
      userAgent.includes("Safari") ||
      userAgent.includes("Firefox");

    return isBrowser;
  }

  return false;
};
