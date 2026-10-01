import Joi from "joi";
import { PROMPT_HISTORY } from "constants/prompt-history.constants";
import {
  GetPromptHistoryQuery,
  PromptHistorySort,
} from "types/prompt-history.types";
import { SUPPORTED_ALGORITHMS } from "utils/prompt.util";
import { RequestValidationSchema } from "types/validator.types";

export const getPromptHistorySchema: RequestValidationSchema = {
  query: Joi.object<GetPromptHistoryQuery>().keys({
    search: Joi.string().trim().max(PROMPT_HISTORY.SEARCH_MAX_LENGTH).allow(""),
    algorithm: Joi.string().valid(...SUPPORTED_ALGORITHMS),
    sort: Joi.string().valid(...Object.values(PromptHistorySort)),
    distinct: Joi.boolean(),
    take: Joi.number().integer().min(1).max(PROMPT_HISTORY.MAX_TAKE),
    skip: Joi.number().integer().min(0),
  }),
};
