import { PAGINATION } from "constants/pagination.constants";
import { ROLES } from "constants/role.constants";
import appDataSource from "database/app-data-source";
import { Report, User } from "entities";
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
} from "utils/report.util";
import {
  handleNotFound,
  handleForbidden,
  jsonResponse,
  handleInternalServerError,
} from "utils/responses.util";
import { isAdmin } from "utils/user.util";
const reportRepository = appDataSource.getRepository(Report);
const userRepository = appDataSource.getRepository(User);

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
  // const {} = req.body;
  const user = res.locals.user!;

  try {
    // create report
    const report = new Report();
    report.reportedBy = user!;
    const createdReport = await reportRepository.save(report);

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

    const isAllowed = canExecuteAction({
      isOwner: report.reportedBy.id === user.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    // Define an object to hold the fields that are allowed to be updated
    let updateData: Partial<Report> = {
      ...(req.body as Omit<UpdateReportRequest, "reportedBy">),
    };

    let reportedBy: User | null = null;
    if (isAdmin(user) && req.body.reportedBy) {
      reportedBy = await userRepository.findOneBy({
        id: req.body.reportedBy,
      });
    }

    /**
     * update displayed owner for report
     */
    if (reportedBy) {
      updateData = { ...updateData, reportedBy: reportedBy };
    }

    await reportRepository.update(report.id, {
      ...updateData,
    });

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
