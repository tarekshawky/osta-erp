import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// A different main database can be switched in without touching DATABASE_URL: connect it with the prefix EMERGENCY and the app uses it. Removing
// those variables puts the app straight back on DATABASE_URL (the original database stays exactly as it was).
const alternateUrl = process.env.EMERGENCY_DATABASE_URL || process.env.EMERGENCY_POSTGRES_URL;

export const prisma = globalForPrisma.prisma ?? new PrismaClient(alternateUrl ? { datasourceUrl: alternateUrl } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
