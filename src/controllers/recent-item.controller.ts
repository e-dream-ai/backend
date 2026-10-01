import httpStatus from "http-status";
import { RECENT_ITEMS } from "constants/recent-item.constants";
import { RequestType, ResponseType } from "types/express.types";
import {
  GetRecentItemsQuery,
  RecentItemParamsRequest,
  RecentItemType,
} from "types/recent-item.types";
import { getRecentItems, touchRecentItem } from "utils/recent-item.util";
import {
  handleInternalServerError,
  handleNotFound,
  jsonResponse,
} from "utils/responses.util";

export const handleGetRecentItems = async (
  req: RequestType<unknown, GetRecentItemsQuery>,
  res: ResponseType,
) => {
  try {
    const items = await getRecentItems({
      user: res.locals.user!,
      type: req.query.type as RecentItemType,
      take: Number(req.query.take) || RECENT_ITEMS.TAKE,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { items } }));
  } catch (err) {
    return handleInternalServerError(err as Error, req as RequestType, res);
  }
};

export const handleTouchRecentItem = async (
  req: RequestType<unknown, unknown, RecentItemParamsRequest>,
  res: ResponseType,
) => {
  try {
    const item = await touchRecentItem({
      user: res.locals.user!,
      type: req.params.type as RecentItemType,
      dreamUuid: req.params.dreamUuid!,
    });

    if (!item) return handleNotFound(req as RequestType, res);

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { item } }));
  } catch (err) {
    return handleInternalServerError(err as Error, req as RequestType, res);
  }
};
