import { Dream, FeedItem } from "entities";
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
import { FindOptionsSelect } from "typeorm";
import { getUserSelectedColumns } from "./user.util";
import { FeedItemType } from "types/feed-item.types";
import { APP_LOGGER } from "shared/logger";

const queueUrl = ""; // env.AWS_SQS_URL;

const PROCESS_VIDEO_SERVER_URL = env.PROCESS_VIDEO_SERVER_URL;
const feedRepository = appDataSource.getRepository(FeedItem);

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
    created_at: true,
    updated_at: true,
    deleted_at: true,
    original_video: originalVideo,
    featureRank: featureRank,
    user: getUserSelectedColumns({ userEmail }),
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
