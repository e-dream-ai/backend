import { ModelProvider, PROVIDERS } from "types/model.types";
import { APP_LOGGER } from "shared/logger";

export type ProviderKeyValidator = (key: string) => Promise<boolean>;

const FAL_VALIDATION_URL = "https://api.fal.ai/v1/models?limit=1";

const pingWithKey = async (
  url: string,
  headers: Record<string, string>,
): Promise<boolean> => {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(10000),
  });
  return response.status === 200;
};

const validateFalKey: ProviderKeyValidator = (key) =>
  pingWithKey(FAL_VALIDATION_URL, { Authorization: `Key ${key}` });

const PROVIDER_KEY_VALIDATORS: Partial<
  Record<ModelProvider, ProviderKeyValidator>
> = {
  [PROVIDERS.FAL]: validateFalKey,
};

export const isProviderKeySupported = (provider: ModelProvider): boolean =>
  provider in PROVIDER_KEY_VALIDATORS;

export const validateProviderKey = async (
  provider: ModelProvider,
  key: string,
): Promise<boolean> => {
  const validator = PROVIDER_KEY_VALIDATORS[provider];
  if (!validator) {
    throw new Error(`Key validation not supported for provider "${provider}"`);
  }
  try {
    return await validator(key);
  } catch (error) {
    // Log only the error type, never the message — the failing request carried
    // the plaintext key in its headers and some fetch errors echo request context.
    const reason = error instanceof Error ? error.name : "unknown error";
    APP_LOGGER.error(
      `Provider key validation failed for ${provider}: ${reason}`,
    );
    return false;
  }
};
