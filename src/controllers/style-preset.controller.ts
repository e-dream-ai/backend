import httpStatus from "http-status";
import { RequestType, ResponseType } from "types/express.types";
import { GetStylePresetsQuery } from "types/style-preset.types";
import { handleInternalServerError, jsonResponse } from "utils/responses.util";
import { getStylePresets } from "utils/style-preset.util";

export const handleGetStylePresets = async (
  req: RequestType<unknown, GetStylePresetsQuery>,
  res: ResponseType,
) => {
  try {
    const presets = await getStylePresets({
      user: res.locals.user!,
      model: req.query.model ? String(req.query.model) : undefined,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { presets } }));
  } catch (err) {
    return handleInternalServerError(err as Error, req as RequestType, res);
  }
};
