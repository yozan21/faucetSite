import type { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../utils/AppError.js";
import { Role } from "../generated/prisma/client.js";

export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new ForbiddenError();
    if (!roles.includes(req.user.role as Role)) {
      throw new ForbiddenError(
        "You do not have permission to perform this action",
      );
    }
    next();
  };
};
