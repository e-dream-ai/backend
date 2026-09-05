import { NotFoundException } from "@workos-inc/node";
import appDataSource from "database/app-data-source";
import { ApiKey } from "entities/ApiKey.entity";
import { User } from "entities/User.entity";
import { UserProviderKey } from "entities/UserProviderKey.entity";
import { APP_LOGGER } from "shared/logger";
import { IsNull } from "typeorm";
import { workos } from "utils/workos.util";

export const WORKOS_DELETED_AT_METADATA_KEY = "accountDeletedAt";

const revokeWorkOSSessions = async (workOSId: string) => {
  const sessions = await workos.userManagement.listSessions(workOSId);
  for (const session of await sessions.autoPagination()) {
    try {
      await workos.userManagement.revokeSession({ sessionId: session.id });
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
    }
  }
};

const softDeleteWorkOSAccount = async (workOSId: string, deletedAt: Date) => {
  const memberships = await workos.userManagement.listOrganizationMemberships({
    userId: workOSId,
    statuses: ["active", "pending"],
  });

  for (const membership of await memberships.autoPagination()) {
    await workos.userManagement.deactivateOrganizationMembership(membership.id);
  }

  await revokeWorkOSSessions(workOSId);

  await workos.userManagement.updateUser({
    userId: workOSId,
    metadata: { [WORKOS_DELETED_AT_METADATA_KEY]: deletedAt.toISOString() },
  });
};

export const softDeleteAccount = async (user: User): Promise<void> => {
  const deletedAt = new Date();

  await appDataSource.transaction(async (manager) => {
    await manager.update(
      User,
      { id: user.id, deleted_at: IsNull() },
      { deleted_at: deletedAt, enableMarketingEmails: false },
    );
    await manager.softDelete(ApiKey, {
      user: { id: user.id },
      deleted_at: IsNull(),
    });
    await manager.delete(UserProviderKey, { user: { id: user.id } });
  });

  if (user.workOSId) {
    try {
      await softDeleteWorkOSAccount(user.workOSId, deletedAt);
    } catch (error) {
      APP_LOGGER.error(
        `Failed to soft-delete WorkOS account ${user.workOSId} for user ${user.id}`,
        error,
      );
    }
  }
};
