import httpStatus from "http-status";
import { PROMPT_HISTORY } from "constants/prompt-history.constants";
import { RequestType, ResponseType } from "types/express.types";
import {
  GetPromptHistoryQuery,
  PromptHistorySort,
} from "types/prompt-history.types";
import { getPromptHistory } from "utils/prompt-history.util";
import { handleInternalServerError, jsonResponse } from "utils/responses.util";

export const handleGetPromptHistory = async (
  req: RequestType<unknown, GetPromptHistoryQuery>,
  res: ResponseType,
) => {
  try {
    const { search, algorithm, sort, distinct, take, skip } = req.query;

    const { dreams, count } = await getPromptHistory({
      userId: res.locals.user!.id,
      search: search ? String(search) : undefined,
      algorithm: algorithm ? String(algorithm) : undefined,
      sort: (sort as PromptHistorySort | undefined) ?? PromptHistorySort.RECENT,
      distinct: String(distinct) !== "false",
      take: Number(take) || PROMPT_HISTORY.TAKE,
      skip: Number(skip) || 0,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dreams, count } }));
  } catch (err) {
    return handleInternalServerError(err as Error, req as RequestType, res);
  }
};
