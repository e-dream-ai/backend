import { RequestType, ResponseType } from "types/express.types";
import httpStatus from "http-status";
import { jsonResponse } from "utils/responses.util";
import { handleInternalServerError } from "utils/responses.util";
import { userRepository } from "database/repositories";
import { FindOperator, FindOptionsWhere, IsNull, Not } from "typeorm";
import { User } from "entities";
import { enqueueMarketingEmails } from "utils/marketing-queue.util";
import { MARKETING_SEND_MAX_PER_RUN } from "constants/marketing.constants";
import { APP_LOGGER } from "shared/logger";
import env from "shared/env";
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "utils/marketing-unsubscribe.util";
import { ResendEmailError, sendTemplateEmail } from "utils/resend.util";
import Joi from "joi";
import { mapValidatorErrors } from "middlewares/validator.middleware";

const sendMarketingSchema = Joi.object({
  templateId: Joi.string().required(),
  dryRun: Joi.boolean().default(false),
  limit: Joi.number().integer().min(0),
  offset: Joi.number().integer().min(0).default(0),
  email: Joi.string().email(),
  userId: Joi.number().integer().min(1),
})
  .nand("email", "userId")
  .required();

const sendOneMarketingSchema = Joi.object({
  email: Joi.string().email().required(),
  templateId: Joi.string().required(),
  unsubscribeToken: Joi.string().required(),
}).required();

const getUnsubscribeToken = (req: RequestType): string | undefined => {
  const bodyToken =
    typeof req.body?.token === "string" ? req.body.token : undefined;
  const queryToken =
    typeof req.query?.token === "string" ? req.query.token : undefined;

  return bodyToken || queryToken;
};

const unsubscribeByToken = async (token: string) => {
  const verification = verifyUnsubscribeToken(token);
  if (!verification.valid) {
    return {
      success: false as const,
      message: "invalid or expired token",
    };
  }

  const { userId, email } = verification.payload;

  const user = await userRepository.findOne({
    where: { id: userId, email },
    select: { id: true, enableMarketingEmails: true },
  });

  if (!user) {
    return {
      success: false as const,
      message: "invalid or expired token",
    };
  }

  if (!user.enableMarketingEmails) {
    return {
      success: true as const,
      status: "already_unsubscribed" as const,
    };
  }

  await userRepository.update(
    { id: user.id, email },
    { enableMarketingEmails: false },
  );

  return {
    success: true as const,
    status: "unsubscribed" as const,
  };
};

export const handleSendMarketingEmails = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const emailSecretHeader = req.headers["x-email-secret"];
    const emailSecret = Array.isArray(emailSecretHeader)
      ? emailSecretHeader[0]
      : emailSecretHeader;
    if (!emailSecret || emailSecret !== env.EMAIL_SECRET) {
      return res.status(httpStatus.FORBIDDEN).json(
        jsonResponse({
          success: false,
          message: "Forbidden",
        }),
      );
    }

    const { error, value } = sendMarketingSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          data: mapValidatorErrors(error),
          message: error.message,
        }),
      );
    }

    const { templateId, dryRun, limit, offset, email, userId } = value;

    const where: FindOptionsWhere<User> = {
      enableMarketingEmails: true,
      email: Not(IsNull()) as FindOperator<string>,
    };

    if (email) {
      where.email = email;
    }

    if (userId) {
      where.id = userId;
    }

    const totalEligible = await userRepository.count({ where });
    const requestedCount = limit ?? totalEligible;
    const remaining = Math.max(totalEligible - offset, 0);
    const targetCount = Math.min(requestedCount, remaining);

    if (targetCount > MARKETING_SEND_MAX_PER_RUN) {
      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          message: `Requested ${targetCount} exceeds max per run ${MARKETING_SEND_MAX_PER_RUN}`,
        }),
      );
    }

    if (dryRun) {
      return res.status(httpStatus.OK).json(
        jsonResponse({
          success: true,
          data: {
            templateId,
            dryRun,
            totalEligible,
            offset,
            count: targetCount,
            triggeredBy: res.locals.user?.id ?? null,
            createdAt: new Date().toISOString(),
          },
        }),
      );
    }

    const users = await userRepository.find({
      where,
      select: {
        id: true,
        email: true,
      },
      order: {
        id: "ASC",
      },
      skip: offset,
      take: targetCount,
    });

    const jobs = users
      .filter((user) => !!user.email)
      .map((user) => ({
        userId: user.id,
        email: user.email as string,
        templateId,
        unsubscribeToken: createUnsubscribeToken({
          userId: user.id,
          email: user.email as string,
        }),
      }));

    const result = await enqueueMarketingEmails(jobs);

    if (!result.success) {
      APP_LOGGER.error("Failed to enqueue marketing emails", result.error);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
        jsonResponse({
          success: false,
          message: "Failed to enqueue marketing emails",
        }),
      );
    }

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          templateId,
          dryRun,
          totalEligible,
          offset,
          count: targetCount,
          triggeredBy: res.locals.user?.id ?? null,
          createdAt: new Date().toISOString(),
          queued: result.count,
        },
      }),
    );
  } catch (error) {
    return handleInternalServerError(error as Error, req, res);
  }
};

export const handleUnsubscribeMarketing = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const token = getUnsubscribeToken(req);
    if (!token) {
      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          message: "token is required",
        }),
      );
    }

    const result = await unsubscribeByToken(token);
    if (!result.success) {
      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          message: result.message,
        }),
      );
    }

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          status: result.status,
        },
        message: result.status,
      }),
    );
  } catch (error) {
    return handleInternalServerError(error as Error, req, res);
  }
};

export const handleSendOneMarketingEmail = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const emailSecretHeader = req.headers["x-email-secret"];
    const emailSecret = Array.isArray(emailSecretHeader)
      ? emailSecretHeader[0]
      : emailSecretHeader;
    if (!emailSecret || emailSecret !== env.EMAIL_SECRET) {
      return res.status(httpStatus.FORBIDDEN).json(
        jsonResponse({
          success: false,
          message: "Forbidden",
        }),
      );
    }

    const { error, value } = sendOneMarketingSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          data: mapValidatorErrors(error),
          message: error.message,
        }),
      );
    }

    const { email, templateId, unsubscribeToken } = value;

    const encodedToken = encodeURIComponent(unsubscribeToken);
    const headerUnsubscribeUrl = `${env.BACKEND_DOMAIN}/v1/marketing/unsubscribe?token=${encodedToken}`;
    const templateUnsubscribeUrl = `${env.FRONTEND_URL}/unsubscribe?token=${encodedToken}`;

    await sendTemplateEmail({
      to: email,
      templateId,
      headerUnsubscribeUrl,
      templateUnsubscribeUrl,
    });

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
      }),
    );
  } catch (error) {
    if (error instanceof ResendEmailError) {
      return res.status(error.statusCode).json(
        jsonResponse({
          success: false,
          message: error.message,
        }),
      );
    }
    return handleInternalServerError(error as Error, req, res);
  }
};
