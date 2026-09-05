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
  const query = userRepository
    .createQueryBuilder("account")
    .withDeleted()
    .where("account.deleted_at IS NOT NULL")
    .andWhere(
      workOSId
        ? `(LOWER(account.email) = :email OR account."workOSId" = :workOSId)`
        : "LOWER(account.email) = :email",
      { email: email.trim().toLowerCase(), workOSId },
    );

  return query.getExists();
};

export const assertAccountActive = async (
  email: string,
  workOSId?: string,
): Promise<void> => {
  if (await isAccountDeleted(email, workOSId)) {
    throw new AccountDeletedError();
  }
};
