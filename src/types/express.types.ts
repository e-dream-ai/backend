import type { Request, Response } from "express";
import type { DeepPartial } from "utility-types";
import { MiddlewareUser } from "./auth.types";

export type RequestType<
  ReqBody = Record<string, unknown>,
  QueryString = Record<string, unknown>,
> = Request<
  Record<string, unknown>,
  Record<string, unknown>,
  DeepPartial<ReqBody>,
  DeepPartial<QueryString>
>;

// export interface LocalsType extends Locals { user: MiddlewareUser}

// export interface ResponseType extends Response { Locals: LocalsType }

export type LocalsType = {
  user?: MiddlewareUser;
  accessToken?: string;
} & Record<string, unknown>;

export type ResponseType = Response<Record<string, unknown>, LocalsType>;
