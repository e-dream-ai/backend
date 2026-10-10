import Joi from "joi";
import { FeedItemType } from "types/feed-item.types";
import {
  FEED_ORPHANS_FILTERS,
  GetFeedRequest,
  GetGroupedFeedRequest,
} from "types/feed.types";
import { DreamMediaType } from "types/dream.types";

const feedQueryKeys = {
  take: Joi.number(),
  skip: Joi.number(),
  search: Joi.string(),
  type: Joi.string().valid(FeedItemType.DREAM, FeedItemType.PLAYLIST),
  userUUID: Joi.string().uuid(),
  onlyHidden: Joi.string().valid("true", "false"),
  mediaType: Joi.string().valid(...Object.values(DreamMediaType)),
};

export const feedSchema = {
  query: Joi.object<GetFeedRequest>().keys(feedQueryKeys),
};

export const groupedFeedSchema = {
  query: Joi.object<GetGroupedFeedRequest>().keys({
    ...feedQueryKeys,
    orphans: Joi.string().valid(...FEED_ORPHANS_FILTERS),
  }),
};
