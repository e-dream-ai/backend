import appDataSource from "database/app-data-source";
import { UserProviderKey } from "entities";
import { ModelProvider } from "types/model.types";
import { decryptSecret, encryptSecret, hashApiKey } from "utils/crypto.util";
import { validateProviderKey } from "services/provider-key-validators";

const userProviderKeyRepository = appDataSource.getRepository(UserProviderKey);

export interface ProviderKeyStatus {
  provider: ModelProvider;
  isValid: boolean;
  lastValidatedAt: Date | null;
}

export const upsertUserProviderKey = async (
  userId: number,
  provider: ModelProvider,
  key: string,
): Promise<ProviderKeyStatus> => {
  const isValid = await validateProviderKey(provider, key);

  const existing = await userProviderKeyRepository.findOne({
    where: { user: { id: userId }, provider },
  });

  const lastValidatedAt = new Date();
  const record =
    existing ??
    userProviderKeyRepository.create({ user: { id: userId }, provider });
  record.encryptedKey = encryptSecret(key);
  record.keyHash = hashApiKey(key);
  record.isValid = isValid;
  record.lastValidatedAt = lastValidatedAt;

  await userProviderKeyRepository.save(record);

  return { provider, isValid, lastValidatedAt };
};

export const getUserProviderKeyStatus = async (
  userId: number,
  provider: ModelProvider,
): Promise<ProviderKeyStatus | null> => {
  const record = await userProviderKeyRepository.findOne({
    where: { user: { id: userId }, provider },
  });
  if (!record) return null;
  return {
    provider: record.provider,
    isValid: record.isValid,
    lastValidatedAt: record.lastValidatedAt,
  };
};

export const deleteUserProviderKey = async (
  userId: number,
  provider: ModelProvider,
): Promise<void> => {
  await userProviderKeyRepository.delete({ user: { id: userId }, provider });
};

export const getDecryptedProviderKey = async (
  userId: number,
  provider: ModelProvider,
): Promise<string | null> => {
  const record = await userProviderKeyRepository.findOne({
    where: { user: { id: userId }, provider },
  });
  if (!record) return null;
  return decryptSecret(record.encryptedKey);
};
