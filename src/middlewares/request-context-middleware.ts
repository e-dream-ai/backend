import { NextFunction } from "express";
import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { RequestType, ResponseType } from "types/express.types";
import { getRequestContext } from "utils/api.util";

export const requestContextMiddleware = async (
  req: RequestType,
  res: ResponseType,
  next: NextFunction,
) => {
  try {
    const context = getRequestContext(req.headers);

    res.locals.requestContext = {
      type: context.type,
      version: context.version,
      userAgent: context.userAgent,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const socketRequestContextMiddleware = async (
  socket: Socket,
  next: (err?: ExtendedError | undefined) => void,
) => {
  try {
    const context = getRequestContext(socket.handshake.headers);

    socket.data.requestContext = {
      type: context.type,
      version: context.version,
      userAgent: context.userAgent,
    };

    next();
  } catch (error) {
    return next(error as ExtendedError);
  }
};
