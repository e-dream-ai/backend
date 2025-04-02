import { featureRepository } from "database/repositories";
import httpStatus from "http-status";
import { RequestType, ResponseType } from "types/express.types";
import { UpdateFeatureRequest } from "types/feature.types";
import {
  handleInternalServerError,
  handleNotFound,
  jsonResponse,
} from "utils/responses.util";

/**
 * Handles get features
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - features
 * BAD_REQUEST 400 - error getting features
 *
 */
export const handleGetFeatures = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const features = await featureRepository.find();

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { features } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};

/**
 * Handles update feature
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - feature
 * BAD_REQUEST 400 - error updating feature
 *
 */
export const handleUpdateFeature = async (
  req: RequestType<UpdateFeatureRequest>,
  res: ResponseType,
) => {
  const { name, isActive } = req.body;

  try {
    const feature = await featureRepository.findOne({
      where: {
        name,
      },
    });

    if (!feature) {
      return handleNotFound(req, res);
    }

    await featureRepository.update(feature.id, {
      isActive,
    });

    const updatedFeature = await featureRepository.findOne({
      where: {
        name,
      },
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { feature: updatedFeature } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};
