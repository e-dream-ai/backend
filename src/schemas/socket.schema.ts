import Joi from "joi";
import { REMOTE_CONTROLS, RemoteControlEvent } from "types/socket.types";

export const remoteControlSchema = Joi.object<RemoteControlEvent>({
  event: Joi.string()
    .required()
    .valid(...Object.values(REMOTE_CONTROLS)),
  name: Joi.string(),
  uuid: Joi.string().uuid(),
  key: Joi.string(),
}).required();
