import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { PAGINATION } from "constants/pagination.constants";
import appDataSource from "database/app-data-source";
import { FeedItem } from "entities/FeedItem.entity";
import httpStatus from "http-status";
import { APP_LOGGER } from "shared/logger";
import { FindOptionsWhere, ILike } from "typeorm";
import { RequestType, ResponseType } from "types/express.types";
import { GetFeedRequest } from "types/feed.types";
import { getFeedSelectedColumns } from "utils/feed.util";
import { jsonResponse } from "utils/responses.util";

/**
 * Handles get my dreams
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dreams gotten
 * BAD_REQUEST 400 - error getting dreams
 *
 */
export const handleGetFeed = async (
  req: RequestType<unknown, GetFeedRequest>,
  res: ResponseType,
) => {
  const take = Math.min(
    Number(req.query.take) || PAGINATION.TAKE,
    PAGINATION.TAKE,
  );
  const skip = Number(req.query.skip) || PAGINATION.SKIP;
  const search = req.query.search ? String(req.query.search) : undefined;
  const userId = Number(req.query.userId) || undefined;
  const type = req.query.type;

  try {
    const feedRepository = appDataSource.getRepository(FeedItem);
    const dreamItemSearch: FindOptionsWhere<FeedItem> = {
      user: userId ? { id: userId } : undefined,
      dreamItem: search ? { name: ILike(`%${search}%`) } : undefined,
      type: type,
    };
    const playlistItemSearch: FindOptionsWhere<FeedItem> = {
      user: userId ? { id: userId } : undefined,
      playlistItem: search ? { name: ILike(`%${search}%`) } : undefined,
      type: type,
    };
    const isSearchEnabled = Boolean(userId) || Boolean(search) || Boolean(type);
    const whereSentence = isSearchEnabled
      ? ([dreamItemSearch, playlistItemSearch] as FindOptionsWhere<FeedItem>[])
      : undefined;
    const [feed, count] = await feedRepository.findAndCount({
      where: whereSentence,
      select: getFeedSelectedColumns(),
      relations: { user: true, dreamItem: true, playlistItem: true },
      order: { created_at: "DESC" },
      take,
      skip,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { feed, count } }));
  } catch (error) {
    APP_LOGGER.error(error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      jsonResponse({
        success: false,
        message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
      }),
    );
  }
};

/**
 * Handles get my dreams
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dreams gotten
 * BAD_REQUEST 400 - error getting dreams
 *
 */
export const handleGetMyDreams = async (
  req: RequestType,
  res: ResponseType,
) => {
  const take = Math.min(
    Number(req.query.take) || PAGINATION.TAKE,
    PAGINATION.TAKE,
  );
  const skip = Number(req.query.skip) || PAGINATION.SKIP;
  const user = res.locals.user;

  try {
    const feedRepository = appDataSource.getRepository(FeedItem);
    const [feed, count] = await feedRepository.findAndCount({
      where: { user: { id: user?.id } },
      select: getFeedSelectedColumns(),
      relations: { user: true, dreamItem: true, playlistItem: true },
      order: { created_at: "DESC" },
      take,
      skip,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { feed, count } }));
  } catch (error) {
    APP_LOGGER.error(error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      jsonResponse({
        success: false,
        message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
      }),
    );
  }
};
