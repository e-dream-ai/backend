import { userRepository } from "database/repositories";
import { Raw } from "typeorm";

export class AccountDeletedError extends Error {
  constructor() {
    super("This account is no longer available.");
    this.name = "AccountDeletedError";
  }
}

export const normalizedEmailCondition = (email: string) =>
  Raw((column) => `LOWER(${column}) = :accountEmail`, {
    accountEmail: email.trim().toLowerCase(),
  });

export const isAccountDeleted = async (
  email: string,
  workOSId?: string,
): Promise<boolean> => {
  const normalizedEmail = email.trim().toLowerCase();

  const accounts = await userRepository
    .createQueryBuilder("account")
    .withDeleted()
    .select(["account.id", "account.deleted_at", "account.workOSId"])
    .where(
      workOSId
        ? `(LOWER(account.email) = :email OR account."workOSId" = :workOSId)`
        : "LOWER(account.email) = :email",
      { email: normalizedEmail, workOSId },
    )
    .getMany();

  if (!accounts.length) return false;

  if (workOSId) {
    const identity = accounts.find((account) => account.workOSId === workOSId);
    if (identity) return identity.deleted_at !== null;
  }

  return accounts.every((account) => account.deleted_at !== null);
};

export const assertAccountActive = async (
  email: string,
  workOSId?: string,
): Promise<void> => {
  if (await isAccountDeleted(email, workOSId)) {
    throw new AccountDeletedError();
  }
};
