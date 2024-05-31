import { PAGINATION } from "constants/pagination.constants";
import appDataSource from "database/app-data-source";
import { Invite } from "entities";
import httpStatus from "http-status";
import { RequestType, ResponseType } from "types/express.types";
import { CreateInviteRequest, GetInvitesQuery } from "types/invite.types";
import { generateInvite, getInviteSelectedColumns } from "utils/invite.util";
import {
  jsonResponse,
  handleInternalServerError,
  handleNotFound,
} from "utils/responses.util";

/**
 * Repositories
 */
const inviteRepository = appDataSource.getRepository(Invite);

/**
 * Handles get invites
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - invites
 * BAD_REQUEST 400 - error getting invites
 *
 */
export const handleGetInvites = async (
  req: RequestType<unknown, GetInvitesQuery>,
  res: ResponseType,
) => {
  try {
    const take = Math.min(
      Number(req.query.take) || PAGINATION.TAKE,
      PAGINATION.MAX_TAKE,
    );
    const skip = Number(req.query.skip) || PAGINATION.SKIP;

    const [invites, count] = await inviteRepository.findAndCount({
      select: getInviteSelectedColumns(),
      order: { size: "DESC" },
      take,
      skip,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { invites, count } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles create invite
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - invite
 * BAD_REQUEST 400 - error creating invite
 *
 */
export const handleCreateInvite = async (
  req: RequestType<CreateInviteRequest>,
  res: ResponseType,
) => {
  // email to which the invitation will be sent
  const { size, codeLength } = req.body;

  try {
    // create invite
    const createdInvite = await generateInvite({ size, codeLength });

    return res
      .status(httpStatus.CREATED)
      .json(jsonResponse({ success: true, data: { invite: createdInvite } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};

/**
 * Handles create invite
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - invite
 * BAD_REQUEST 400 - error creating invite
 *
 */
export const handleInvalidateInvite = async (
  req: RequestType<CreateInviteRequest>,
  res: ResponseType,
) => {
  const id: number = Number(req.params.id) || 0;

  try {
    const invite = await inviteRepository.findOne({
      where: { id },
      select: getInviteSelectedColumns(),
    });

    if (!invite) {
      return handleNotFound(req, res);
    }

    invite.size = 0;

    const updatedInvite = await inviteRepository.save(invite);

    return res
      .status(httpStatus.CREATED)
      .json(jsonResponse({ success: true, data: { invite: updatedInvite } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};
