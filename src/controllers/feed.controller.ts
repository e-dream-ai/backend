import { PAGINATION } from "constants/pagination.constants";
import { feedItemRepository } from "database/repositories";
import { FeedItem } from "entities/FeedItem.entity";
import httpStatus from "http-status";
import { FindOptionsWhere } from "typeorm";
import { RequestType, ResponseType } from "types/express.types";
import { FeedItemType } from "types/feed-item.types";
import { GetFeedRequest } from "types/feed.types";
import {
  formatFeedResponse,
  getFeedFindOptionsRelations,
  getFeedFindOptionsWhere,
  getFeedSelectedColumns,
  groupFeedDreamItemsByPlaylist,
} from "utils/feed.util";
import { handleInternalServerError, jsonResponse } from "utils/responses.util";
import { isAdmin } from "utils/user.util";
import { transformFeedItemsWithSignedUrls } from "utils/transform.util";

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
  const nsfw = user?.nsfw;

  try {
    // Base query options
    const baseOptions: FindOptionsWhere<FeedItem> = {
      type: FeedItemType.PLAYLIST,
    };

    // Get where conditions with appropriate hidden item handling
    const whereSentence = getFeedFindOptionsWhere(baseOptions, {
      nsfw,
      isAdmin: isUserAdmin,
      userId: user.id,
      ranked: true,
    });

    const [rawFeed, count] = await feedItemRepository.findAndCount({
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

    const feed = await formatFeedResponse(rawFeed);

    // Transform feed items to include signed URLs
    const transformedFeed = await transformFeedItemsWithSignedUrls(feed);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { feed: transformedFeed, count },
      }),
    );
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
  const nsfw = user?.nsfw;
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
      nsfw,
      search,
      onlyHidden,
      isAdmin: isUserAdmin,
      userId: user.id,
    });

    const [rawFeed, count] = await feedItemRepository.findAndCount({
      where: whereSentence,
      select: getFeedSelectedColumns(),
      relations: getFeedFindOptionsRelations(),
      order: { created_at: "DESC" },
      take,
      skip,
    });

    const feed = await formatFeedResponse(rawFeed);

    // Transform feed items to include signed URLs
    const transformedFeed = await transformFeedItemsWithSignedUrls(feed);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { feed: transformedFeed, count },
      }),
    );
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
  const nsfw = user?.nsfw;

  try {
    // Base query options
    const baseOptions: FindOptionsWhere<FeedItem> = {
      user: { id: user?.id },
    };

    // Get where conditions with appropriate hidden item handling
    const whereSentence = getFeedFindOptionsWhere(baseOptions, {
      nsfw,
      isAdmin: isUserAdmin,
      userId: user.id,
    });

    const [rawFeed, count] = await feedItemRepository.findAndCount({
      where: whereSentence,
      select: getFeedSelectedColumns(),
      relations: getFeedFindOptionsRelations(),
      order: { created_at: "DESC" },
      take,
      skip,
    });

    const feed = await formatFeedResponse(rawFeed);

    // Transform feed items to include signed URLs
    const transformedFeed = await transformFeedItemsWithSignedUrls(feed);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { feed: transformedFeed, count },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};

/**
 * Handles get grouped feed with virtual playlists
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - grouped feed gotten
 * BAD_REQUEST 400 - error getting grouped feed
 *
 */
export const handleGetGroupedFeed = async (
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
  const nsfw = user?.nsfw;
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
      nsfw,
      search,
      onlyHidden,
      isAdmin: isUserAdmin,
      userId: user.id,
    });

    const [rawFeed, count] = await feedItemRepository.findAndCount({
      where: whereSentence,
      select: getFeedSelectedColumns(),
      relations: getFeedFindOptionsRelations(),
      order: { created_at: "DESC" },
      take,
      skip,
    });

    const feed = await formatFeedResponse(rawFeed);

    // Transform feed items to include signed URLs
    const transformedFeed = await transformFeedItemsWithSignedUrls(feed);

    // Group dreams by playlist for virtual playlists
    const groups = groupFeedDreamItemsByPlaylist(transformedFeed);
    const dreamUUIDs = new Set<string>();

    const virtualPlaylists = Array.from(groups.entries()).map(([, pl]) => pl);

    // Collect UUIDs of dreams that are now in virtual playlists
    groups.forEach((group) => {
      group.dreams.forEach((dream) => {
        dreamUUIDs.add(dream.uuid);
      });
    });

    // Filter out dreams that are now in virtual playlists from the main feed
    const filteredFeed = transformedFeed.filter(
      (feedItem) =>
        !(feedItem.dreamItem && dreamUUIDs.has(feedItem.dreamItem.uuid)),
    );

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          feedItems: filteredFeed,
          virtualPlaylists,
          count,
        },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};
