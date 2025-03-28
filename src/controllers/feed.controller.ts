import { PAGINATION } from "constants/pagination.constants";
import appDataSource from "database/app-data-source";
import { FeedItem } from "entities/FeedItem.entity";
import httpStatus from "http-status";
import { FindOptionsWhere, MoreThanOrEqual } from "typeorm";
import { RequestType, ResponseType } from "types/express.types";
import { FeedItemType } from "types/feed-item.types";
import { GetFeedRequest } from "types/feed.types";
import {
  getFeedFindOptionsRelations,
  getFeedFindOptionsWhere,
  getFeedSelectedColumns,
} from "utils/feed.util";
import { handleInternalServerError, jsonResponse } from "utils/responses.util";
import { isAdmin } from "utils/user.util";

const feedRepository = appDataSource.getRepository(FeedItem);

/**
 * Handles get ranked feed
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dreams gotten
 * BAD_REQUEST 400 - error getting dreams
 *
 */
export const handleGetRankedFeed = async (
  req: RequestType<unknown, GetFeedRequest>,
  res: ResponseType,
) => {
  const take = Math.min(
    Number(req.query.take) || PAGINATION.TAKE,
    PAGINATION.MAX_TAKE,
  );
  const skip = Number(req.query.skip) || PAGINATION.SKIP;
  const user = res.locals.user!;
  const isUserAdmin = isAdmin(user);
  const showNSFW = user?.nsfw;

  try {
    // Base query options
    const baseOptions: FindOptionsWhere<FeedItem> = {
      type: FeedItemType.PLAYLIST,
      playlistItem: { featureRank: MoreThanOrEqual(1) },
    };

    // Get where conditions with appropriate hidden item handling
    const whereSentence = getFeedFindOptionsWhere(baseOptions, {
      showNSFW,
      isAdmin: isUserAdmin,
      userId: user.id,
    });

    const [feed, count] = await feedRepository.findAndCount({
      where: whereSentence,
      select: getFeedSelectedColumns(),
      relations: getFeedFindOptionsRelations(),
      order: {
        playlistItem: {
          featureRank: "DESC",
        },
      },
      take,
      skip,
    });

    //Remove feature rank column
    feed.forEach((item: FeedItem) => {
      delete item?.dreamItem?.featureRank;
      delete item?.playlistItem?.featureRank;
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { feed, count } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get feed
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
    PAGINATION.MAX_TAKE,
  );
  const skip = Number(req.query.skip) || PAGINATION.SKIP;
  const search = req.query.search ? String(req.query.search) : undefined;
  const userUUID = req.query.userUUID;
  const type = req.query.type;
  const user = res.locals.user!;
  const showNSFW = user?.nsfw;
  // Convert to boolean since Joi handles it as string since we are working with a query param
  const onlyHidden = req.query.onlyHidden === "true";
  const isUserAdmin = isAdmin(user);

  try {
    // Base query options
    const baseOptions: FindOptionsWhere<FeedItem> = {
      user: userUUID ? { uuid: userUUID } : undefined,
      type: type,
    };

    // Get where conditions with appropriate hidden item handling
    const whereSentence = getFeedFindOptionsWhere(baseOptions, {
      showNSFW,
      search,
      onlyHidden,
      isAdmin: isUserAdmin,
      userId: user.id,
    });

    const [feed, count] = await feedRepository.findAndCount({
      where: whereSentence,
      select: getFeedSelectedColumns(),
      relations: getFeedFindOptionsRelations(),
      order: { created_at: "DESC" },
      take,
      skip,
    });

    //Remove feature rank column
    feed.forEach((item: FeedItem) => {
      delete item?.dreamItem?.featureRank;
      delete item?.playlistItem?.featureRank;
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { feed, count } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
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
    PAGINATION.MAX_TAKE,
  );
  const skip = Number(req.query.skip) || PAGINATION.SKIP;
  const user = res.locals.user!;
  const isUserAdmin = isAdmin(user);
  const showNSFW = user?.nsfw;

  try {
    // Base query options
    const baseOptions: FindOptionsWhere<FeedItem> = {
      user: { id: user?.id },
    };

    // Get where conditions with appropriate hidden item handling
    const whereSentence = getFeedFindOptionsWhere(baseOptions, {
      showNSFW,
      isAdmin: isUserAdmin,
      userId: user.id,
    });

    const [feed, count] = await feedRepository.findAndCount({
      where: whereSentence,
      select: getFeedSelectedColumns(),
      relations: getFeedFindOptionsRelations(),
      order: { created_at: "DESC" },
      take,
      skip,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { feed, count } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};
