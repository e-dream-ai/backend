import { DEFAULT_QUEUE } from "constants/job.constants";
import httpStatus from "http-status";
import { RequestType, ResponseType } from "types/express.types";
import { getQueueValues } from "utils/job.util";
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
