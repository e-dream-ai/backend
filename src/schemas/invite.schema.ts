import Joi from "joi";
import {
  GetInvitesQuery,
  CreateInviteRequest,
  InvalidateInviteQuery,
} from "types/invite.types";

export const inviteQuerySchema = {
  query: Joi.object<GetInvitesQuery>().keys({
    take: Joi.number(),
    skip: Joi.number(),
  }),
};

export const createInviteSchema = {
  body: Joi.object<CreateInviteRequest>().keys({
    code: Joi.string()
      .pattern(/^[ABCDEFGHJKLMNPQRSTUVWXYZ0123456789]*$/)
      .messages({
        "string.pattern.base":
          "Code should contain A-Z and 0-9 (excluding I and O)",
      }),
    size: Joi.number().integer().positive().greater(0),
    codeLength: Joi.number().integer().positive().greater(0),
    emails: Joi.array().items(Joi.string().email()),
    roleId: Joi.number().required(),
  }),
};

export const invalidateInviteSchema = {
  query: Joi.object<InvalidateInviteQuery>().keys({
    id: Joi.number(),
  }),
};
