// src/utils/parseRequest.ts
import type { ZodSchema } from "zod";
import { BadRequestError } from "./AppError.js";

export const parseRequest = <T>(schema: ZodSchema<T>, data: unknown): T => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.issues.reduce(
      (acc, issue) => {
        const field = issue.path[0]?.toString() ?? "general";
        acc[field] = issue.message;
        return acc;
      },
      {} as Record<string, string>,
    );
    throw new BadRequestError("Validation failed", errors);
  }
  return parsed.data;
};
