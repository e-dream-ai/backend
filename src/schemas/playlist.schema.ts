import Joi from "joi";
import { AddPlaylistItemRequest } from "types/playlist.types";

export const addPlaylistItemSchema = {
  body: Joi.object<AddPlaylistItemRequest>().keys({
    type: Joi.string(),
    id: Joi.string(),
  }),
};
