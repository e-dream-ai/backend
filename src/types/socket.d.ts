/* eslint-disable */
import { User } from "entities";
import { Socket } from "socket.io";
import { RequestContext } from "./express.types";
/* eslint-enable */

/**
 * Socket data types
 */
declare module "socket.io" {
  interface Socket {
    data?: { user?: User; requestContext?: RequestContext };
    cookies: {
      [key: string]: string;
    };
  }
}
