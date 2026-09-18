import Joi from "joi";
import {
  EDITOR_PROJECT_NAME_MAX_LENGTH,
  EDITOR_PROJECT_SESSION_ID_MAX_LENGTH,
} from "constants/editor-project.constants";
import { PAGINATION } from "constants/pagination.constants";
import {
  CreateEditorProjectRequest,
  EditorProjectLockQuery,
  EditorProjectLockRequest,
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

const thumbnailDreamUuid = Joi.string().uuid().allow(null);

const playlistUuid = Joi.string().uuid().allow(null);

const uuidParams = Joi.object<EditorProjectParamsRequest>().keys({
  uuid: Joi.string().uuid().required(),
});

export const getEditorProjectsSchema: RequestValidationSchema = {
  query: Joi.object<GetEditorProjectsQuery>().keys({
    editorId,
    playlistUuid: Joi.string().uuid(),
    search: Joi.string().trim().max(EDITOR_PROJECT_NAME_MAX_LENGTH).allow(""),
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
    thumbnailDreamUuid,
    playlistUuid,
  }),
};

const sessionId = Joi.string().trim().max(EDITOR_PROJECT_SESSION_ID_MAX_LENGTH);

export const updateEditorProjectSchema: RequestValidationSchema = {
  body: Joi.object<UpdateEditorProjectRequest>()
    .keys({
      revision: Joi.number().integer().min(1).required(),
      name,
      state,
      schemaVersion,
      thumbnailDreamUuid,
      playlistUuid,
      sessionId,
    })
    .or("name", "state", "schemaVersion", "thumbnailDreamUuid", "playlistUuid"),
  params: uuidParams,
};

export const deleteEditorProjectSchema: RequestValidationSchema = {
  params: uuidParams,
};

export const lockEditorProjectSchema: RequestValidationSchema = {
  body: Joi.object<EditorProjectLockRequest>().keys({
    sessionId: sessionId.required(),
    force: Joi.boolean(),
  }),
  params: uuidParams,
};

export const unlockEditorProjectSchema: RequestValidationSchema = {
  query: Joi.object<EditorProjectLockQuery>().keys({
    sessionId: sessionId.required(),
  }),
  params: uuidParams,
};
