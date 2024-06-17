import {
  DEFAULT_QUEUE,
  TURN_OFF_QUANTITY,
  TURN_ON_QUANTITY,
} from "constants/job.constants";
import httpStatus from "http-status";
import { RequestType, ResponseType } from "types/express.types";
import { getQueueValues, updateVideoServiceWorker } from "utils/job.util";
import { handleInternalServerError, jsonResponse } from "utils/responses.util";

/**
 * Handles get jobs
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - jobs
 * BAD_REQUEST 400 - error getting dream
 *
 */
export const handleGetJobs = async (req: RequestType, res: ResponseType) => {
  try {
    const jobs = await getQueueValues(DEFAULT_QUEUE);
    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { jobs } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles turn on
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - turned on
 * BAD_REQUEST 400 - error turning on
 *
 */
export const handleTurnOn = async (req: RequestType, res: ResponseType) => {
  try {
    const successfully = await updateVideoServiceWorker(TURN_ON_QUANTITY);
    if (successfully) {
      return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
    } else {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json(jsonResponse({ success: false }));
    }
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles turn off
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - turned off
 * BAD_REQUEST 400 - error turning off
 *
 */
export const handleTurnOff = async (req: RequestType, res: ResponseType) => {
  try {
    const successfully = await updateVideoServiceWorker(TURN_OFF_QUANTITY);
    if (successfully) {
      return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
    } else {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json(jsonResponse({ success: false }));
    }
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};
