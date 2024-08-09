import Joi from "joi";
import {
  AddPlaylistItemRequest,
  CreatePlaylistRequest,
  OrderPlaylist,
  OrderPlaylistRequest,
  PlaylistItemType,
  PlaylistParamsRequest,
  RemovePlaylistItemRequest,
  UpdatePlaylistRequest,
} from "types/playlist.types";
import { RequestValidationSchema } from "types/validator.types";

export const requestPlaylistSchema: RequestValidationSchema = {
  params: Joi.object<PlaylistParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const createPlaylistSchema: RequestValidationSchema = {
  body: Joi.object<CreatePlaylistRequest>().keys({
    name: Joi.string().required(),
  }),
};

export const updatePlaylistSchema: RequestValidationSchema = {
  body: Joi.object<UpdatePlaylistRequest>().keys({
    name: Joi.string().required().max(100),
    featureRank: Joi.number().integer(),
    displayedOwner: Joi.number().greater(0).integer(),
  }),
  params: Joi.object<PlaylistParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const orderPlaylistSchema: RequestValidationSchema = {
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
  params: Joi.object<PlaylistParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const addPlaylistItemSchema: RequestValidationSchema = {
  body: Joi.object<AddPlaylistItemRequest>().keys({
    type: Joi.string()
      .required()
      .valid(PlaylistItemType.DREAM, PlaylistItemType.PLAYLIST),
    uuid: Joi.string().uuid().required(),
  }),
  params: Joi.object<PlaylistParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const removePlaylistItemSchema: RequestValidationSchema = {
  params: Joi.object<RemovePlaylistItemRequest>().keys({
    uuid: Joi.string().uuid().required(),
    itemId: Joi.number().integer().positive().required(),
  }),
};
