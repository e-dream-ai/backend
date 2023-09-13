import { JsonResponse } from "types/responses.types";

export const jsonResponse: (response: JsonResponse) => JsonResponse = (
  response,
) => response;
