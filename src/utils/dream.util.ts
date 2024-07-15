import { Dream, FeedItem, User, Vote } from "entities";
import {
  SendMessageCommand,
  SendMessageCommandInput,
} from "@aws-sdk/client-sqs";
import { sqsClient } from "clients/sqs.client";
import {
  PROCESS_VIDEO_QUEUE_ATTRIBUTES,
  SQS_DATA_TYPES,
} from "constants/sqs.constants";
import appDataSource from "database/app-data-source";
import env from "shared/env";
import axios from "axios";
import { ContentType, getRequestHeaders } from "constants/api.constants";
import { FindOptionsSelect, FindOptionsWhere } from "typeorm";
import { getUserSelectedColumns } from "./user.util";
import { FeedItemType } from "types/feed-item.types";
import { APP_LOGGER } from "shared/logger";
import { VOTE_FIELDS, VoteType } from "types/vote.types";

const queueUrl = ""; // env.AWS_SQS_URL;

const PROCESS_VIDEO_SERVER_URL = env.PROCESS_VIDEO_SERVER_URL;

const dreamRepository = appDataSource.getRepository(Dream);
const feedRepository = appDataSource.getRepository(FeedItem);
const voteRepository = appDataSource.getRepository(Vote);

/**
 * @deprecated Currently unused due to sqs queue being replaced by redis queue
 * Send dream to sqs queue
 * @param dream - dream should include contain user data
 */
export const processDreamSQS = async (dream: Dream) => {
  const input: SendMessageCommandInput = {
    QueueUrl: queueUrl,
    MessageGroupId: dream.uuid,
    MessageBody: dream.uuid,
    MessageAttributes: {
      [PROCESS_VIDEO_QUEUE_ATTRIBUTES.UUID]: {
        StringValue: dream.uuid,
        DataType: SQS_DATA_TYPES.STRING,
      },
      [PROCESS_VIDEO_QUEUE_ATTRIBUTES.VIDEO]: {
        StringValue: dream.video ?? "",
        DataType: SQS_DATA_TYPES.STRING,
      },
      [PROCESS_VIDEO_QUEUE_ATTRIBUTES.USER_UUID]: {
        StringValue: dream.user.cognitoId ?? "",
        DataType: SQS_DATA_TYPES.STRING,
      },
    },
  };

  const command = new SendMessageCommand(input);
  await sqsClient.send(command);
};

/**
 * Send dream process request to video server
 * @param dream - dream should include contain user data
 */
export const processDreamRequest = async (dream: Dream) => {
  const extension = getFileExtension(dream.original_video || "");
  const data = {
    user_uuid: dream.user.cognitoId,
    dream_uuid: dream.uuid,
    extension,
  };
  return axios
    .post(`${PROCESS_VIDEO_SERVER_URL}/process-video`, data, {
      headers: getRequestHeaders({
        contentType: ContentType.json,
      }),
    })
    .then((res) => {
      return res.data;
    })
    .catch((error) => APP_LOGGER.error(error));
};

export const getDreamSelectedColumns = ({
  originalVideo,
  featureRank,
  userEmail,
}: {
  originalVideo?: boolean;
  featureRank?: boolean;
  userEmail?: boolean;
} = {}): FindOptionsSelect<Dream> => {
  return {
    id: true,
    uuid: true,
    name: true,
    video: true,
    thumbnail: true,
    upvotes: true,
    downvotes: true,
    activityLevel: true,
    status: true,
    processedVideoSize: true,
    processedVideoFrames: true,
    processedVideoFPS: true,
    nsfw: true,
    filmstrip: true,
    processed_at: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
    original_video: originalVideo,
    featureRank: featureRank,
    user: getUserSelectedColumns({ userEmail }),
    displayedOwner: getUserSelectedColumns(),
  };
};

export const getFileExtension = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex !== -1) {
    return fileName.slice(dotIndex + 1).toLowerCase();
  } else {
    return ""; // No extension found
  }
};

/**
 * finds one dream
 * @param where - where conditions
 * @param select - columns to select
 * @returns {Dream} dream
 */
export const findOneDream = async ({
  where,
  select,
}: {
  where: FindOptionsWhere<Dream> | FindOptionsWhere<Dream>[];
  select: FindOptionsSelect<Dream>;
}): Promise<Dream | null> => {
  const dream = await dreamRepository.findOne({
    where: where,
    select: select,
  });

  return dream;
};

export const createFeedItem = async (dream: Dream) => {
  /**
   * create feed item when dream is created
   */
  let feedItem = await feedRepository.findOne({
    where: { dreamItem: { uuid: dream.uuid } },
  });

  if (!feedItem) {
    feedItem = new FeedItem();
    feedItem.type = FeedItemType.DREAM;
    feedItem.user = dream?.user;
    feedItem.dreamItem = dream;
    await feedRepository.save(feedItem);
  }

  return feedItem;
};

/**
 * handle vote dream
 * @param dream - dream should include contain user data
 */
export const handleVoteDream = async ({
  dream,
  user,
  voteType,
}: {
  dream: Dream;
  user: User;
  voteType: VoteType;
}) => {
  let [vote] = await voteRepository.find({
    where: { dream: { id: dream.id }, user: { id: user?.id } },
  });

  // current operation is upvote or downvote
  const isUpvote = voteType === VoteType.UPVOTE;
  const isDownvote = voteType === VoteType.DOWNVOTE;

  // previous data was upvote or downvote
  const wasUpvote = vote ? vote.vote === VoteType.UPVOTE : false;
  const wasDownvote = vote ? vote.vote === VoteType.DOWNVOTE : false;

  if (!vote) {
    vote = new Vote();
    vote.dream = dream;
    vote.user = user!;
  }

  vote.vote = voteType;
  // save vote
  await voteRepository.save(vote);

  // calculate upvotes and downvotes changes
  const upvoteChange: number = (isUpvote ? 1 : 0) - (wasUpvote ? 1 : 0);
  const downvoteChange: number = (isDownvote ? 1 : 0) - (wasDownvote ? 1 : 0);

  // Actualiza los conteos de votos
  await dreamRepository
    .createQueryBuilder()
    .update(Dream)
    .whereInIds([dream.id])
    .set({
      upvotes: () => `GREATEST(upvotes + ${upvoteChange}, 0)`,
      downvotes: () => `GREATEST(downvotes + ${downvoteChange}, 0)`,
    })
    .execute();
};

/**
 * handle downvote dream
 * @param dream - dream should include contain user data
 */
export const handleDownvoteDream = async ({
  dream,
  user,
}: {
  dream: Dream;
  user: User;
}) => {
  let shouldIncreaseDownvotes = true,
    shouldDecreaseUpvotes = false;

  let [vote] = await voteRepository.find({
    where: { dream: { id: dream.id }, user: { id: user?.id } },
  });

  if (vote) {
    shouldIncreaseDownvotes = vote.vote === VoteType.DOWNVOTE ? false : true;
    shouldDecreaseUpvotes = vote.vote === VoteType.UPVOTE ? true : false;
  } else {
    vote = new Vote();
    vote.dream = dream;
    vote.user = user!;
  }

  vote.vote = VoteType.DOWNVOTE;
  // save vote
  voteRepository.save(vote);

  // increment downvotes
  if (shouldIncreaseDownvotes) {
    await dreamRepository
      .createQueryBuilder()
      .update(Dream)
      .whereInIds([dream.id])
      .set({ downvotes: () => `${VOTE_FIELDS.DOWNVOTES} + 1` })
      .execute();
  }

  // decrement upvotes if needed
  if (shouldDecreaseUpvotes) {
    await dreamRepository
      .createQueryBuilder()
      .update(Dream)
      .whereInIds([dream.id])
      .set({ upvotes: () => `${VOTE_FIELDS.UPVOTES} - 1` })
      .execute();
  }
};

/**
 * get top dreams
 * @param {number} take - dreams to take
 * @returns {string[]} dreams uuids
 */
export const getTopDreams = async (take: number = 50) => {
  const dreams = await dreamRepository.find({
    take,
    order: { upvotes: "DESC" },
  });

  return dreams.map((dream) => dream.uuid);
};
