import Joi from "joi";
import {
  DeviceType,
  PresenceHeartbeatPayload,
  PresenceJoinPayload,
  RolesRequestPayload,
} from "types/roles.types";

export const deviceTypeSchema = Joi.string<DeviceType>().valid(
  "phone",
  "tablet",
  "desktop",
  "web",
);

export const presenceJoinSchema = Joi.object<PresenceJoinPayload>({
  deviceId: Joi.string().min(8).max(128).required(),
  deviceType: deviceTypeSchema.required(),
  canPlay: Joi.boolean().required(),
  preferredRole: Joi.string()
    .valid("player", "remote", "both", "auto")
    .optional(),
}).required();

export const presenceHeartbeatSchema = Joi.object<PresenceHeartbeatPayload>({
  deviceId: Joi.string().min(8).max(128).required(),
}).required();

export const rolesRequestSchema = Joi.object<RolesRequestPayload>({
  deviceId: Joi.string().min(8).max(128).required(),
  desired: Joi.string().valid("player", "remote", "both").required(),
}).required();
