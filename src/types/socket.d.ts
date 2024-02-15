/* eslint-disable */
import { User } from "entities";
import { Socket } from "socket.io";
/* eslint-enable */

declare module "socket.io" {
  interface Socket {
    data?: { user?: User }; // Aquí puedes ser más específico con el tipo si es necesario
  }
}
