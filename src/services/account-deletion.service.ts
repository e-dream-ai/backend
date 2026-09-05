import { NotFoundException } from "@workos-inc/node";
import appDataSource from "database/app-data-source";
import { ApiKey } from "entities/ApiKey.entity";
import { User } from "entities/User.entity";
import { IsNull } from "typeorm";
import { workos } from "utils/workos.util";

export const softDeleteAccount = async (user: User): Promise<void> => {
  if (user.workOSId) {
    const sessions = await workos.userManagement.listSessions(user.workOSId);
    for (const session of await sessions.autoPagination()) {
      try {
        await workos.userManagement.revokeSession({ sessionId: session.id });
      } catch (error) {
        if (!(error instanceof NotFoundException)) throw error;
      }
    }
  }

  await appDataSource.transaction(async (manager) => {
    await manager.update(
      User,
      { id: user.id, deleted_at: IsNull() },
      { deleted_at: new Date(), enableMarketingEmails: false },
    );
    await manager.softDelete(ApiKey, {
      user: { id: user.id },
      deleted_at: IsNull(),
    });
  });
};
