import Joi from "joi";
import {
  EDITOR_PROJECT_NAME_MAX_LENGTH,
  EDITOR_PROJECT_THUMBNAIL_MAX_LENGTH,
} from "constants/editor-project.constants";
import { PAGINATION } from "constants/pagination.constants";
import {
  CreateEditorProjectRequest,
  EditorId,
  EditorProjectParamsRequest,
  GetEditorProjectsQuery,
  UpdateEditorProjectRequest,
} from "types/editor-project.types";
import { RequestValidationSchema } from "types/validator.types";

const editorId = Joi.string().valid(...Object.values(EditorId));

const name = Joi.string().trim().max(EDITOR_PROJECT_NAME_MAX_LENGTH);

const state = Joi.object().unknown(true);

const schemaVersion = Joi.number().integer().min(1);

const thumbnail = Joi.string()
  .max(EDITOR_PROJECT_THUMBNAIL_MAX_LENGTH)
  .allow(null, "");

const playlistUuid = Joi.string().uuid().allow(null);

const uuidParams = Joi.object<EditorProjectParamsRequest>().keys({
  uuid: Joi.string().uuid().required(),
});

export const getEditorProjectsSchema: RequestValidationSchema = {
  query: Joi.object<GetEditorProjectsQuery>().keys({
    editorId,
    playlistUuid: Joi.string().uuid(),
    take: Joi.number().integer().min(1).max(PAGINATION.MAX_TAKE),
    skip: Joi.number().integer().min(0),
  }),
};

export const getEditorProjectSchema: RequestValidationSchema = {
  params: uuidParams,
};

export const createEditorProjectSchema: RequestValidationSchema = {
  body: Joi.object<CreateEditorProjectRequest>().keys({
    editorId: editorId.required(),
    name: name.required(),
    state: state.required(),
    schemaVersion,
    thumbnail,
    playlistUuid,
  }),
};

export const updateEditorProjectSchema: RequestValidationSchema = {
  body: Joi.object<UpdateEditorProjectRequest>()
    .keys({
      revision: Joi.number().integer().min(1).required(),
      name,
      state,
      schemaVersion,
      thumbnail,
      playlistUuid,
    })
    .or("name", "state", "schemaVersion", "thumbnail", "playlistUuid"),
  params: uuidParams,
};

export const deleteEditorProjectSchema: RequestValidationSchema = {
  params: uuidParams,
};
