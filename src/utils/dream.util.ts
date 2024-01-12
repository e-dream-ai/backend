import { Dream } from "entities";
import {
  SendMessageCommand,
  SendMessageCommandInput,
} from "@aws-sdk/client-sqs";
import { sqsClient } from "clients/sqs.client";
import {
  PROCESS_VIDEO_QUEUE,
  PROCESS_VIDEO_QUEUE_ATTRIBUTES,
  SQS_DATA_TYPES,
} from "constants/sqs.constants";
import env from "shared/env";

const queueUrl = env.AWS_SQS_URL;

/**
 * Send dream to sqs queue
 * @param dream - dream should include contain user data
 */
export const processDreamSQS = async (dream: Dream) => {
  const input: SendMessageCommandInput = {
    QueueUrl: queueUrl,
    MessageGroupId: dream.user.cognitoId,
    MessageBody: PROCESS_VIDEO_QUEUE.MESSAGE_BODY,
    MessageAttributes: {
      [PROCESS_VIDEO_QUEUE_ATTRIBUTES.UUID]: {
        StringValue: dream.uuid,
        DataType: SQS_DATA_TYPES.STRING,
      },
      [PROCESS_VIDEO_QUEUE_ATTRIBUTES.VIDEO]: {
        StringValue: dream.video ?? "",
        DataType: SQS_DATA_TYPES.STRING,
      },
    },
  };

  const command = new SendMessageCommand(input);
  await sqsClient.send(command);
};
