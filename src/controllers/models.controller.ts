import httpStatus from "http-status";
import { getModelCatalog } from "constants/models.constants";
import { RequestType, ResponseType } from "types/express.types";
import { GetModelsQuery } from "types/model.types";
import { handleInternalServerError, jsonResponse } from "utils/responses.util";

export const handleGetModels = async (
  req: RequestType<Record<string, unknown>, GetModelsQuery>,
  res: ResponseType,
) => {
  try {
    const models = getModelCatalog(req.query.mediaType);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { models },
      }),
    );
  } catch (err) {
    return handleInternalServerError(err as Error, req, res);
  }
};
