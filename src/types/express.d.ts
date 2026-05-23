import { Role } from "../generated/prisma/index.js";
import type { IpInfo } from "../utils/ipUtils.ts";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: bigint;
        username: string;
        email: string | null;
        role: Role;
        isActive: boolean;
        isBanned: boolean;
      };
      ipInfo?: IpInfo;
      earlyAccess?: EarlyAccess;
    }
  }
}
