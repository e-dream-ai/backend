import { Dream } from "entities";
import {
  SendMessageCommand,
  SendMessageCommandInput,
} from "@aws-sdk/client-sqs";
import { sqsClient } from "clients/sqs.client";
import {
  PROCESS_VIDEO_QUEUE_ATTRIBUTES,
  SQS_DATA_TYPES,
} from "constants/sqs.constants";
import env from "shared/env";
import axios from "axios";
import { ContentType, getRequestHeaders } from "constants/api.constants";
import { FindOptionsSelect } from "typeorm";

const queueUrl = ""; // env.AWS_SQS_URL;

const PROCESS_VIDEO_SERVER_URL = env.PROCESS_VIDEO_SERVER_URL;

/**
 * Feature currently unused due to sqs queue being replaced by redis queue
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
 * Send dream process video request
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
    .catch((error) => console.error(error));
};

export const getDreamSelectedColumns = ({
  originalVideo,
}: {
  originalVideo: boolean;
}): FindOptionsSelect<Dream> => {
  const columns = [
    "id",
    "uuid",
    "name",
    "video",
    "thumbnail",
    "user",
    "upvotes",
    "downvotes",
    "activityLevel",
    "status",
    "created_at",
    "updated_at",
    "deleted_at",
  ];

  if (originalVideo) columns.push("original_video");

  return columns as FindOptionsSelect<Dream>;
};

export const getFileExtension = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex !== -1) {
    return fileName.slice(dotIndex + 1).toLowerCase();
  } else {
    return ""; // No extension found
  }
};
