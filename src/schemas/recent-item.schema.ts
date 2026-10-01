import Joi from "joi";
import { RECENT_ITEMS } from "constants/recent-item.constants";
import {
  GetRecentItemsQuery,
  RecentItemParamsRequest,
  RecentItemType,
} from "types/recent-item.types";
import { RequestValidationSchema } from "types/validator.types";

const type = Joi.string().valid(...Object.values(RecentItemType));

export const getRecentItemsSchema: RequestValidationSchema = {
  query: Joi.object<GetRecentItemsQuery>().keys({
    type: type.required(),
    take: Joi.number().integer().min(1).max(RECENT_ITEMS.MAX_PER_TYPE),
  }),
};

export const touchRecentItemSchema: RequestValidationSchema = {
  params: Joi.object<RecentItemParamsRequest>().keys({
    type: type.required(),
    dreamUuid: Joi.string().uuid().required(),
  }),
};
