import env from "shared/env";
import { APP_LOGGER } from "shared/logger";
import { Resend } from "resend";

const resend = new Resend(env.RESEND_API_KEY);

export class ResendEmailError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "ResendEmailError";
    this.statusCode = statusCode;
  }
}

export const sendTemplateEmail = async ({
  to,
  templateId,
  headerUnsubscribeUrl,
  templateUnsubscribeUrl,
}: {
  to: string;
  templateId: string;
  headerUnsubscribeUrl?: string;
  templateUnsubscribeUrl?: string;
}): Promise<void> => {
  const headers: Record<string, string> = {};

  if (headerUnsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${headerUnsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const { error } = await resend.emails.send({
    to,
    template: {
      id: templateId,
      variables: templateUnsubscribeUrl
        ? { UNSUBSCRIBE_URL: templateUnsubscribeUrl }
        : undefined,
    },
    headers: Object.keys(headers).length ? headers : undefined,
  });

  if (error) {
    APP_LOGGER.error("Failed to send email with Resend:", error);
    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? ((error as { statusCode?: number }).statusCode as number)
        : 502;
    throw new ResendEmailError(error.message, statusCode);
  }
};
