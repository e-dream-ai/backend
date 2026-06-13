import Joi from "joi";
import { GetDreamsQuery, GetDreamsRequestQuery } from "types/client.types";
import { RequestValidationSchema } from "types/validator.types";

export const clientDreamsSchema: RequestValidationSchema = {
  query: Joi.object<GetDreamsQuery>().keys({
    uuids: Joi.string().required(),
  }),
};

// Cap the batch size so a single request can't ask the server to load and
// serialize an unbounded number of dreams. Large playlists (e.g. a
// playlist-of-playlists) must page/chunk into requests of at most this many
// uuids rather than sending everything at once. See client issue #522.
export const CLIENT_DREAMS_MAX_UUIDS = 1000;

export const clientDreamsRequestSchema: RequestValidationSchema = {
  body: Joi.object<GetDreamsRequestQuery>().keys({
    uuids: Joi.array()
      .items(Joi.string().uuid())
      .max(CLIENT_DREAMS_MAX_UUIDS)
      .required(),
  }),
};
