export type JsonResponse = {
  success: boolean;
  message?: string;
  data?: object;
  errorCode?: string;
  retryAfterSeconds?: number;
};
