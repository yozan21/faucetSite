import { PrismaClient } from "../generated/prisma/index.js";

export type PrismaTx = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];
