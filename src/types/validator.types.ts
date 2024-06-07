import type { RequireAtLeastOne } from "types/utility.types";
import type { ObjectSchema } from "joi";

export type RequestValidationSchema = RequireAtLeastOne<
  Record<"body" | "query" | "params", ObjectSchema>
>;
