import httpStatus from "http-status";
import { RequestType, ResponseType } from "types/express.types";
import { jsonResponse, handleInternalServerError } from "utils/responses.util";
import * as userApiEndpointService from "services/user-api-endpoint.service";

export const handleListEndpoints = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const userId = req.user!.id;
    const endpoints = await userApiEndpointService.list(userId);
    res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { endpoints } }));
  } catch (err) {
    handleInternalServerError(err as Error, req, res);
  }
};

export const handleCreateEndpoint = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const userId = req.user!.id;
    const result = await userApiEndpointService.create(userId, req.body);

    if (!result.success) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(jsonResponse({ success: false, message: result.error }));
    }

    res
      .status(httpStatus.CREATED)
      .json(
        jsonResponse({ success: true, data: { endpoint: result.endpoint } }),
      );
  } catch (err) {
    handleInternalServerError(err as Error, req, res);
  }
};

export const handleUpdateEndpoint = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const userId = req.user!.id;
    const { uuid } = req.params as { uuid: string };
    const result = await userApiEndpointService.update(uuid, userId, req.body);

    if (!result.success) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(jsonResponse({ success: false, message: result.error }));
    }

    res
      .status(httpStatus.OK)
      .json(
        jsonResponse({ success: true, data: { endpoint: result.endpoint } }),
      );
  } catch (err) {
    handleInternalServerError(err as Error, req, res);
  }
};

export const handleDeleteEndpoint = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const userId = req.user!.id;
    const { uuid } = req.params as { uuid: string };
    const result = await userApiEndpointService.remove(uuid, userId);

    if (!result.success) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(jsonResponse({ success: false, message: result.error }));
    }

    res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (err) {
    handleInternalServerError(err as Error, req, res);
  }
};

export const handleTestEndpoint = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const userId = req.user!.id;
    const { uuid } = req.params as { uuid: string };
    const result = await userApiEndpointService.test(uuid, userId);

    if (!result.success) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(jsonResponse({ success: false, message: result.error }));
    }

    res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (err) {
    handleInternalServerError(err as Error, req, res);
  }
};
