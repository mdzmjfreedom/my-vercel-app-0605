import { PrismaClient } from "@prisma/client";

const FALLBACK_DATABASE_URL =
  "postgresql://neondb_owner:npg_lV9X7RvLJFsj@ep-autumn-cherry-apsyvjwl-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&connect_timeout=15&sslmode=require";
const FALLBACK_DIRECT_URL =
  "postgresql://neondb_owner:npg_lV9X7RvLJFsj@ep-autumn-cherry-apsyvjwl.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

process.env.POSTGRES_PRISMA_URL ||= process.env.DATABASE_URL || FALLBACK_DATABASE_URL;
process.env.POSTGRES_URL_NON_POOLING ||= FALLBACK_DIRECT_URL;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
