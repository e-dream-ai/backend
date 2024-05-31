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
    size: Joi.number(),
    codeLength: Joi.number(),
    email: Joi.string().email(),
  }),
};

export const invalidateInviteSchema = {
  query: Joi.object<InvalidateInviteQuery>().keys({
    id: Joi.number(),
  }),
};
