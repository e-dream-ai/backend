import Joi from "joi";
import {
  AddPlaylistItemRequest,
  AddPlaylistKeyframeRequest,
  CreatePlaylistRequest,
  GetPlaylistQuery,
  OrderPlaylist,
  OrderPlaylistRequest,
  PlaylistItemType,
  PlaylistParamsRequest,
  RemovePlaylistItemRequest,
  RemovePlaylistKeyframeRequest,
  UpdatePlaylistRequest,
} from "types/playlist.types";
import { RequestValidationSchema } from "types/validator.types";

export const requestPlaylistSchema: RequestValidationSchema = {
  query: Joi.object<GetPlaylistQuery>().keys({
    take: Joi.number(),
    skip: Joi.number(),
    search: Joi.string(),
    userUUID: Joi.string().uuid(),
  }),
  params: Joi.object<PlaylistParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const createPlaylistSchema: RequestValidationSchema = {
  body: Joi.object<CreatePlaylistRequest>().keys({
    name: Joi.string().required(),
    nsfw: Joi.boolean(),
    hidden: Joi.boolean().when("$isUserAdmin", {
      is: true,
      then: Joi.allow(),
      otherwise: Joi.forbidden(),
    }),
  }),
};

export const updatePlaylistSchema: RequestValidationSchema = {
  body: Joi.object<UpdatePlaylistRequest>().keys({
    name: Joi.string().required().max(100),
    featureRank: Joi.number().integer(),
    displayedOwner: Joi.number().greater(0).integer(),
    hidden: Joi.boolean().when("$isUserAdmin", {
      is: true,
      then: Joi.allow(),
      otherwise: Joi.forbidden(),
    }),
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

export const addPlaylistKeyframeSchema: RequestValidationSchema = {
  body: Joi.object<AddPlaylistKeyframeRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
  params: Joi.object<PlaylistParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const removePlaylistKeyframeSchema: RequestValidationSchema = {
  params: Joi.object<RemovePlaylistKeyframeRequest>().keys({
    uuid: Joi.string().uuid().required(),
    playlistKeyframeId: Joi.number().integer().positive().required(),
  }),
};
