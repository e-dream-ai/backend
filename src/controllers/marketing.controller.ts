import { RequestType, ResponseType } from "types/express.types";
import httpStatus from "http-status";
import { jsonResponse } from "utils/responses.util";
import { handleInternalServerError } from "utils/responses.util";
import { userRepository } from "database/repositories";
import { IsNull, Not } from "typeorm";
import { enqueueMarketingEmails } from "utils/marketing-queue.util";
import { MARKETING_SEND_MAX_PER_RUN } from "constants/marketing.constants";
import { APP_LOGGER } from "shared/logger";
import env from "shared/env";
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "utils/marketing-unsubscribe.util";
import { sendTemplateEmail } from "utils/resend.util";
import Joi from "joi";
import { mapValidatorErrors } from "middlewares/validator.middleware";

const sendMarketingSchema = Joi.object({
  templateId: Joi.string().required(),
  dryRun: Joi.boolean().default(false),
  limit: Joi.number().integer().min(0),
  offset: Joi.number().integer().min(0).default(0),
}).required();

const sendOneMarketingSchema = Joi.object({
  email: Joi.string().email().required(),
  templateId: Joi.string().required(),
  unsubscribeToken: Joi.string().required(),
}).required();

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

    const { templateId, dryRun, limit, offset } = value;

    const where = {
      enableMarketingEmails: true,
      email: Not(IsNull()),
    };

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
    const token = req.query?.token as string | undefined;
    if (!token) {
      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          message: "token is required",
        }),
      );
    }

    const result = verifyUnsubscribeToken(token);
    if (!result.valid) {
      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          message: "invalid or expired token",
        }),
      );
    }

    const { userId, email } = result.payload;

    await userRepository.update(
      { id: userId, email },
      { enableMarketingEmails: false },
    );

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        message: "unsubscribed",
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

    const unsubscribeUrl = `${env.BACKEND_DOMAIN}/v1/marketing/unsubscribe?token=${unsubscribeToken}`;

    await sendTemplateEmail({
      to: email,
      from: env.RESEND_FROM_EMAIL,
      templateId,
      unsubscribeUrl,
    });

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
      }),
    );
  } catch (error) {
    return handleInternalServerError(error as Error, req, res);
  }
};
