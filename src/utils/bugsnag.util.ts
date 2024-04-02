import env from "../shared/env";

export const getReleaseStage = () => {
  if (env.NODE_ENV === "production") {
    return "production";
  }
  if (env.NODE_ENV === "stage") {
    return "development";
  }

  return "local";
};
