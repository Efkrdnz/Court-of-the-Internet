import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Unexpected errors are logged by the action layer (toFailure); Prisma's own "error" events
    // would also print stack traces for handled races such as a rejected double vote.
    log: process.env.PRISMA_LOG === "1" ? ["query", "warn", "error"] : ["warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;
