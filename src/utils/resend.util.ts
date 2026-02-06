import env from "shared/env";
import { APP_LOGGER } from "shared/logger";
import { Resend } from "resend";

const resend = new Resend(env.RESEND_API_KEY);

export const sendTemplateEmail = async ({
  to,
  from,
  templateId,
  unsubscribeUrl,
}: {
  to: string;
  from: string;
  templateId: string;
  unsubscribeUrl?: string;
}): Promise<void> => {
  const headers: Record<string, string> = {};

  if (unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const { error } = await resend.emails.send({
    from,
    to,
    template: {
      id: templateId,
    },
    headers: Object.keys(headers).length ? headers : undefined,
  });

  if (error) {
    APP_LOGGER.error("Failed to send email with Resend:", error);
    throw new Error(error.message);
  }
};
