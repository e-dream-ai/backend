import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { NextFunction } from "express";
import httpStatus from "http-status";
import { RequestType, ResponseType } from "types/express.types";
import { RoleType } from "types/role.types";
import { jsonResponse } from "utils/responses.util";

export const checkRoleMiddleware = (roles: Array<RoleType>) => {
  return async (req: RequestType, res: ResponseType, next: NextFunction) => {
    //Get the user from previous midleware
    const user = res.locals?.user;

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: AUTH_MESSAGES.USER_NOT_FOUND,
          data: {
            authorizationUrl: process.env.WORKOS_AUTH_URL,
          },
        }),
      );
    }

    //Check if array of authorized roles includes the user's role
    if (roles.indexOf(user?.role.name) > -1) next();
    else
      return res.status(httpStatus.FORBIDDEN).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.FORBIDDEN,
        }),
      );
  };
};
