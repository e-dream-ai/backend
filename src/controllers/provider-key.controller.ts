import httpStatus from "http-status";
import { RequestType, ResponseType } from "types/express.types";
import { ModelProvider, PROVIDERS } from "types/model.types";
import {
  deleteUserProviderKey,
  getDecryptedProviderKey,
  getUserProviderKeyStatus,
  upsertUserProviderKey,
} from "services/provider-key.service";
import { handleInternalServerError, jsonResponse } from "utils/responses.util";
import { APP_LOGGER } from "shared/logger";

const isProvider = (value: unknown): value is ModelProvider =>
  typeof value === "string" &&
  (Object.values(PROVIDERS) as string[]).includes(value);

export const handleUpsertProviderKey = async (
  req: RequestType<{ provider: ModelProvider; key: string }>,
  res: ResponseType,
) => {
  try {
    const user = res.locals.user!;
    const { provider, key } = req.body as {
      provider: ModelProvider;
      key: string;
    };

    const status = await upsertUserProviderKey(user.id, provider, key);

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { providerKey: status } }));
  } catch (err) {
    return handleInternalServerError(err as Error, req, res);
  }
};

export const handleGetProviderKeyStatus = async (
  req: RequestType<Record<string, unknown>, { provider: ModelProvider }>,
  res: ResponseType,
) => {
  try {
    const user = res.locals.user!;
    const provider = req.query.provider as ModelProvider;

    const status = await getUserProviderKeyStatus(user.id, provider);

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { providerKey: status } }));
  } catch (err) {
    return handleInternalServerError(err as Error, req, res);
  }
};

export const handleDeleteProviderKey = async (
  req: RequestType<
    Record<string, unknown>,
    Record<string, unknown>,
    { provider: ModelProvider }
  >,
  res: ResponseType,
) => {
  try {
    const user = res.locals.user!;
    const provider = req.params.provider as ModelProvider;

    await deleteUserProviderKey(user.id, provider);

    return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (err) {
    return handleInternalServerError(err as Error, req, res);
  }
};

export const handleResolveProviderKey = async (
  req: RequestType<
    Record<string, unknown>,
    { userId: string; provider: ModelProvider }
  >,
  res: ResponseType,
) => {
  try {
    const userId = Number(req.query.userId);
    const provider = req.query.provider as ModelProvider;
    if (!Number.isInteger(userId) || !isProvider(provider)) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(jsonResponse({ success: false, message: "Invalid parameters" }));
    }

    APP_LOGGER.info(
      `Internal provider-key resolve: user ${userId}, provider ${provider}`,
    );

    const key = await getDecryptedProviderKey(userId, provider);
    if (!key) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(jsonResponse({ success: false, message: "No key found" }));
    }

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { key } }));
  } catch (err) {
    return handleInternalServerError(err as Error, req, res);
  }
};
