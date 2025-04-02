import httpStatus from "http-status";
import { APP_LOGGER } from "shared/logger";
import { RequestType, ResponseType } from "types/express.types";
import { workos } from "utils/workos.util";
import { ROLES } from "constants/role.constants";
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
    const payload = req.body;
    const sigHeader: string | undefined = req.headers[
      "workos-signature"
    ] as string;

    if (!sigHeader) {
      return res.status(httpStatus.BAD_REQUEST).json();
    }

    const webhook = await workos.webhooks.constructEvent({
      payload: payload,
      sigHeader: sigHeader,
      secret: env.WORKOS_WEBHOOK_SECRET,
    });

    if (webhook.event === "organization_membership.updated") {
      /**
       * Updating role from workos weebhook
       */

      const workosId = webhook.data.userId ?? undefined;
      const user = await userRepository.findOne({
        where: { workOSId: workosId },
      });

      if (user) {
        const role = await roleRepository.findOneBy({ name: ROLES.USER_GROUP });
        const webhookRole = await roleRepository.findOneBy({
          name: webhook.data.role.slug as RoleType,
        });
        await userRepository.update(user.id, { role: webhookRole ?? role! });
      }
    }

    return res.status(httpStatus.OK).json();
  } catch (error) {
    APP_LOGGER.error(error);
    return res.status(httpStatus.BAD_REQUEST).json();
  }
};
