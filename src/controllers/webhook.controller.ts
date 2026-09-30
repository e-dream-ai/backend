import httpStatus from "http-status";
import { APP_LOGGER } from "shared/logger";
import { RequestType, ResponseType } from "types/express.types";
import { workos } from "utils/workos.util";
import { RoleType } from "types/role.types";
import env from "shared/env";
import { roleRepository, userRepository } from "database/repositories";

/**
 * Handles workos webhooks
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - webhook handled
 * BAD_REQUEST 400 - error handling webhook
 *
 */
export const handleWorkosWebhook = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const payload = req.body as unknown as Buffer;
    const sigHeader: string | undefined = req.headers[
      "workos-signature"
    ] as string;

    if (!sigHeader || !Buffer.isBuffer(payload)) {
      return res.status(httpStatus.BAD_REQUEST).json();
    }

    const webhook = await workos.webhooks.constructEvent({
      payload,
      sigHeader: sigHeader,
      secret: env.WORKOS_WEBHOOK_SECRET,
    });

    if (webhook.event === "organization_membership.updated") {
      const workosId = webhook.data.userId ?? undefined;
      const user = await userRepository.findOne({
        where: { workOSId: workosId },
      });

      if (user) {
        const roleSlug = webhook.data.role.slug;
        const role = await roleRepository.findOneBy({
          name: roleSlug as RoleType,
        });

        if (role) {
          await userRepository.update(user.id, { role });
        } else {
          APP_LOGGER.warn(
            `WorkOS webhook role "${roleSlug}" not found for user ${user.id}`,
          );
        }
      }
    }

    return res.status(httpStatus.OK).json();
  } catch (error) {
    APP_LOGGER.error(error);
    return res.status(httpStatus.BAD_REQUEST).json();
  }
};
