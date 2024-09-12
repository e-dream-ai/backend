/* eslint-disable */
import { User } from "entities";
import { Socket } from "socket.io";
/* eslint-enable */

/**
 * Socket data types
 */
declare module "socket.io" {
  interface Socket {
    data?: { user?: User };
    cookies: {
      [key: string]: string;
    };
  }
}
