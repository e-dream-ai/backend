import { RequestType } from "types/express.types";

const EDREAM_USER_AGENT = "EdreamSDK";

export const isBrowserRequest = (req: RequestType): boolean => {
  const userAgent = req.get("User-Agent");

  if (userAgent) {
    const isBrowser =
      userAgent.includes("Mozilla") ||
      userAgent.includes("Chrome") ||
      userAgent.includes("Safari") ||
      userAgent.includes("Firefox") ||
      userAgent.includes(EDREAM_USER_AGENT);

    return isBrowser;
  }

  return false;
};
