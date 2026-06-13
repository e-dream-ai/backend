import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import Joi from "joi";
import { errorMiddleware } from "middlewares/error.middleware";
import {
  CLIENT_DREAMS_MAX_UUIDS,
  clientDreamsRequestSchema,
} from "schemas/client.schema";

describe("errorMiddleware", () => {
  const createRes = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = {
      status: status as unknown as Response["status"],
    } as Response;
    return { res, status, json };
  };

  const req = {} as Request;
  const next: NextFunction = jest.fn();

  it("honors an error's statusCode instead of masking it as 500 (e.g. PayloadTooLargeError -> 413)", () => {
    const { res, status, json } = createRes();
    const err = Object.assign(new Error("request entity too large"), {
      statusCode: httpStatus.REQUEST_ENTITY_TOO_LARGE,
    });

    errorMiddleware(err, req, res, next);

    expect(status).toHaveBeenCalledWith(httpStatus.REQUEST_ENTITY_TOO_LARGE);
    // 4xx surfaces the real reason to the client
    expect(json).toHaveBeenCalledWith({ message: "request entity too large" });
  });

  it("falls back to 500 for errors with no status", () => {
    const { res, status, json } = createRes();

    errorMiddleware(new Error("boom"), req, res, next);

    expect(status).toHaveBeenCalledWith(httpStatus.INTERNAL_SERVER_ERROR);
    // 5xx does not leak the internal error message
    expect(json).toHaveBeenCalledWith({
      message: expect.not.stringContaining("boom"),
    });
  });
});

describe("clientDreamsRequestSchema", () => {
  const validate = (uuids: string[]) =>
    Joi.object(clientDreamsRequestSchema).validate({ body: { uuids } });

  const uuid = "00000000-0000-4000-8000-000000000000";

  it("accepts a batch at the cap", () => {
    const { error } = validate(Array(CLIENT_DREAMS_MAX_UUIDS).fill(uuid));
    expect(error).toBeUndefined();
  });

  it("rejects a batch over the cap so oversized requests are refused cleanly", () => {
    const { error } = validate(Array(CLIENT_DREAMS_MAX_UUIDS + 1).fill(uuid));
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/less than or equal to 1000/);
  });
});
