import appDataSource from "database/app-data-source";
import { User, UserProviderKey } from "entities";
import { ModelProvider } from "types/model.types";

const userRepository = appDataSource.getRepository(User);
const userProviderKeyRepository = appDataSource.getRepository(UserProviderKey);

export const INSUFFICIENT_CREDITS_CODE = "INSUFFICIENT_CREDITS";

export class InsufficientCreditsError extends Error {
  readonly code = INSUFFICIENT_CREDITS_CODE;

  constructor(
    message = "Insufficient credits. Add your own fal.ai API key to continue generating.",
  ) {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

const toBillableAmount = (costUsd: number): string =>
  (Math.ceil(costUsd * 10000) / 10000).toFixed(4);

const chargeProviderCredits = async (
  userId: number,
  costUsd: number,
): Promise<boolean> => {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return false;
  const rows: unknown[] = await userRepository.query(
    `UPDATE "user"
     SET "providerCreditsUsd" = CASE
         WHEN "dailyQuotaUsd" IS NULL THEN "providerCreditsUsd"
         ELSE "providerCreditsUsd" - $1
       END
     WHERE "id" = $2
       AND ("dailyQuotaUsd" IS NULL OR "providerCreditsUsd" >= $1)
     RETURNING "id"`,
    [toBillableAmount(costUsd), userId],
  );
  return rows.length > 0;
};

export const refundProviderCredits = async (
  userId: number,
  costUsd: number,
): Promise<void> => {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return;
  await userRepository.query(
    `UPDATE "user"
     SET "providerCreditsUsd" = LEAST("providerCreditsUsd" + $1, "dailyQuotaUsd")
     WHERE "id" = $2 AND "dailyQuotaUsd" IS NOT NULL`,
    [toBillableAmount(costUsd), userId],
  );
};

const hasValidProviderKey = async (
  userId: number,
  provider: ModelProvider,
): Promise<boolean> => {
  const count = await userProviderKeyRepository.count({
    where: { user: { id: userId }, provider, isValid: true },
  });
  return count > 0;
};

export const resolveProviderKeyDecision = async (params: {
  userId: number;
  provider: ModelProvider;
  costUsd: number;
}): Promise<boolean> => {
  const { userId, provider, costUsd } = params;

  if (await chargeProviderCredits(userId, costUsd)) {
    return true;
  }
  if (await hasValidProviderKey(userId, provider)) {
    return false;
  }
  throw new InsufficientCreditsError();
};
