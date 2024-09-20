import { tracker } from "clients/google-analytics";
import { APP_LOGGER } from "shared/logger";

export const trackUserAction = async (
  userId: string,
  action: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additionalParams: Record<string, any> = {},
) => {
  const clientId = tracker.generateClientId();
  try {
    await tracker.sendEvent(clientId, "user_action", {
      user_id: userId,
      action_type: action,
      ...additionalParams,
    });
  } catch (error) {
    APP_LOGGER.error(error);
  }
};
