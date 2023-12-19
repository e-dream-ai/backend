import Joi from "joi";
import { FeedItemType } from "types/feed-item.types";
import { GetFeedRequest } from "types/feed.types";

export const feedSchema = {
  query: Joi.object<GetFeedRequest>().keys({
    take: Joi.number(),
    skip: Joi.number(),
    search: Joi.string(),
    userId: Joi.number(),
    type: Joi.string().valid(FeedItemType.DREAM, FeedItemType.PLAYLIST),
  }),
};
