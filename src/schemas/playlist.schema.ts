import Joi from "joi";
import {
  AddPlaylistItemRequest,
  CreatePlaylistRequest,
  OrderPlaylist,
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
    name: Joi.string().required(),
  }),
};

export const orderPlaylistSchema = {
  body: Joi.array<OrderPlaylist>().items(
    Joi.object().keys({ order: Joi.number() }),
  ),
};

export const addPlaylistItemSchema = {
  body: Joi.object<AddPlaylistItemRequest>().keys({
    type: Joi.string().required().equal(PlaylistItemType),
    id: Joi.string().required(),
  }),
};
