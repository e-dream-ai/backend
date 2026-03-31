import { DREAM_MESSAGES } from "constants/messages/dream.constants";
import { REPORT_TYPES_MESSAGES } from "constants/messages/report.constants";
import { PAGINATION } from "constants/pagination.constants";
import { NATIVE_REPORT_TYPE_ID } from "constants/report.constantes";
import { ROLES } from "constants/role.constants";
import {
  dreamRepository,
  reportRepository,
  reportTypeRepository,
} from "database/repositories";
import { Report } from "entities";
import httpStatus from "http-status";
import { RequestType, ResponseType } from "types/express.types";
import {
  CreateReportRequest,
  GetReportQuery,
  ReportParamsRequest,
  UpdateReportRequest,
} from "types/report.types";
import { canExecuteAction } from "utils/permissions.util";
import {
  findOneReport,
  getReportFindOptionsRelations,
  getReportSelectedColumns,
  sendReportEmail,
} from "utils/report.util";
import {
  handleNotFound,
  handleForbidden,
  jsonResponse,
  handleInternalServerError,
} from "utils/responses.util";

/**
 * Handles get report
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - report
 * BAD_REQUEST 400 - error getting report
 *
 */
export const handleGetReportTypes = async (
  req: RequestType<unknown, unknown>,
  res: ResponseType,
) => {
  try {
    const reportTypes = await reportTypeRepository.find();

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          reportTypes: reportTypes.filter(
            (rt) => rt.id !== NATIVE_REPORT_TYPE_ID,
          ),
        },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get report
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - report
 * BAD_REQUEST 400 - error getting report
 *
 */
export const handleGetReport = async (
  req: RequestType<unknown, unknown, ReportParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  try {
    const report = await findOneReport({
      where: { uuid },
      select: getReportSelectedColumns(),
    });

    if (!report) {
      return handleNotFound(req as RequestType, res);
    }

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { report } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get report
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - report
 * BAD_REQUEST 400 - error getting report
 *
 */
export const handleGetReports = async (
  req: RequestType<unknown, GetReportQuery>,
  res: ResponseType,
) => {
  const take = Math.min(
    Number(req.query.take) || PAGINATION.TAKE,
    PAGINATION.MAX_TAKE,
  );
  const skip = Number(req.query.skip) || PAGINATION.SKIP;

  try {
    const [reports, count] = await reportRepository.findAndCount({
      select: getReportSelectedColumns(),
      order: { updated_at: "DESC" },
      relations: getReportFindOptionsRelations(),
      take,
      skip,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { reports, count } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles create report
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - report
 * BAD_REQUEST 400 - error creating report
 *
 */
export const handleCreateReport = async (
  req: RequestType<CreateReportRequest>,
  res: ResponseType,
) => {
  const { comments, link, dreamUUID, typeId } = req.body;
  const user = res.locals.user!;

  const [dream, type] = await Promise.all([
    dreamRepository.findOne({ where: { uuid: dreamUUID } }),
    reportTypeRepository.findOne({ where: { id: typeId } }),
  ]);

  // Handle not found cases
  if (!dream) {
    return handleNotFound(req, res, {
      message: DREAM_MESSAGES.NOT_FOUND,
    });
  }

  if (!type) {
    return handleNotFound(req, res, {
      message: REPORT_TYPES_MESSAGES.NOT_FOUND,
    });
  }

  try {
    // create report
    const report = new Report();
    report.reportedBy = user!;
    report.type = type;
    report.dream = dream;
    report.comments = comments;
    report.link = link;
    report.reportedAt = new Date();
    const createdReport = await reportRepository.save(report);

    await sendReportEmail(createdReport);

    return res
      .status(httpStatus.CREATED)
      .json(jsonResponse({ success: true, data: { report: createdReport } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};

/**
 * Handles update report
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - report
 * BAD_REQUEST 400 - error updating report
 *
 */
export const handleUpdateReport = async (
  req: RequestType<UpdateReportRequest, unknown, ReportParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;

  try {
    const report = await findOneReport({
      where: { uuid },
      select: getReportSelectedColumns(),
    });

    if (!report) {
      return handleNotFound(req as RequestType, res);
    }

    if (req.body.processed) {
      await reportRepository.update(report.id, {
        processed: req.body.processed,
        processedBy: user,
        processedAt: new Date(),
      });
    }

    const updatedReport = await findOneReport({
      where: { id: report.id },
      select: getReportSelectedColumns(),
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { report: updatedReport } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles delete report
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - report
 * BAD_REQUEST 400 - error deleting report
 *
 */
export const handleDeleteReport = async (
  req: RequestType<unknown, unknown, ReportParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;
  try {
    const report = await findOneReport({
      where: { uuid },
      select: getReportSelectedColumns(),
    });

    if (!report) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: report.reportedBy.id === user.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    const affected = await reportRepository.softRemove(report);

    if (!affected) {
      return handleNotFound(req as RequestType, res);
    }

    return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};
