import Joi from "joi";
import {
  AddPlaylistItemRequest,
  CreatePlaylistRequest,
  OrderPlaylist,
  OrderPlaylistRequest,
  PlaylistItemType,
  UpdatePlaylistRequest,
} from "types/playlist.types";

export const createPlaylistSchema = {
  body: Joi.object<CreatePlaylistRequest>().keys({
    name: Joi.string().required(),
  }),
};

export const updatePlaylistSchema = {
  body: Joi.object<UpdatePlaylistRequest>().keys({
    name: Joi.string().required().max(100),
  }),
};

export const orderPlaylistSchema = {
  body: Joi.object<OrderPlaylistRequest>().keys({
    order: Joi.array()
      .required()
      .items(
        Joi.object<OrderPlaylist>().keys({
          id: Joi.number().required(),
          order: Joi.number().required(),
        }),
      ),
  }),
};

export const addPlaylistItemSchema = {
  body: Joi.object<AddPlaylistItemRequest>().keys({
    type: Joi.string()
      .required()
      .valid(PlaylistItemType.DREAM, PlaylistItemType.PLAYLIST),
    id: Joi.number().required(),
  }),
};
