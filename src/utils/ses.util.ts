import { SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-ses";
import { sesClient } from "clients/ses.client";
import { APP_LOGGER } from "shared/logger";

/**
 * Sends an email using AWS SES
 *
 * @param {string[]} toAddresses email addresses of the recipients
 * @param {string} body body of the email
 * @param {string} subject subject of email
 * @param {string} fromAddress email address of the sender
 * @returns {Promise<void>} promise that resolves when the email is sent
 */
export const sendEmail = async ({
  toAddresses,
  body,
  subject,
  fromAddress,
}: {
  toAddresses: string[];
  body: string;
  subject: string;
  fromAddress: string;
}) => {
  const params: SendEmailCommandInput = {
    Destination: {
      ToAddresses: toAddresses,
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: body,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: fromAddress,
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
  } catch (error) {
    APP_LOGGER.error(error);
  }
};
