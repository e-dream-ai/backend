export const MARKETING_QUEUE_NAME =
  process.env.MARKETING_QUEUE_NAME || "marketing-email";

export const MARKETING_SEND_MAX_PER_RUN =
  parseInt(process.env.MARKETING_SEND_MAX_PER_RUN || "10000", 10) || 10000;
