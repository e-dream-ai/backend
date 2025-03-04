import env from "shared/env";

export const getEmailPrefix = () => {
  if (env.NODE_ENV === "production") {
    return "";
  }
  if (env.NODE_ENV === "stage") {
    return "[STAGE] - ";
  }

  return "[LOCAL] - ";
};
