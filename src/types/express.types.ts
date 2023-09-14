// typed Express.Request type
import type { Request, Response } from "express";
import type { DeepPartial } from "utility-types";

export type RequestType<
  ReqBody = Record<string, unknown>,
  QueryString = Record<string, unknown>,
> = Request<
  Record<string, unknown>,
  Record<string, unknown>,
  DeepPartial<ReqBody>,
  DeepPartial<QueryString>
>;

export type ResponseTpe = Response;
