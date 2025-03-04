import Joi from "joi";
import {
  CreateReportRequest,
  GetReportQuery,
  ReportParamsRequest,
  UpdateReportRequest,
} from "types/report.types";
import { RequestValidationSchema } from "types/validator.types";

export const requestReportSchema: RequestValidationSchema = {
  params: Joi.object<ReportParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const getReportsSchema: RequestValidationSchema = {
  query: Joi.object<GetReportQuery>().keys({
    take: Joi.number(),
    skip: Joi.number(),
  }),
  params: Joi.object<ReportParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const createReportSchema: RequestValidationSchema = {
  body: Joi.object<CreateReportRequest>().keys({
    dreamUUID: Joi.string().uuid().required(),
    typeId: Joi.number().positive().required(),
    comments: Joi.string().empty().allow(""),
    link: Joi.string().empty().allow(""),
  }),
};

export const updateReportSchema: RequestValidationSchema = {
  body: Joi.object<UpdateReportRequest>().keys({
    processed: Joi.boolean().required(),
  }),
  params: Joi.object<ReportParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};
