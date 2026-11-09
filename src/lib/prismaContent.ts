import { PrismaClient } from "@/generated/prisma-content";

// The content database holds the media library and the audit log (see prisma/content.prisma). When CONTENT_DATABASE_URL is not set, this client
// simply uses the main database, where the same tables still exist, so nothing changes until the second database is switched on.
const globalForContent = globalThis as unknown as { prismaContent: PrismaClient | undefined };

// Vercel names the variable after the prefix chosen when the database is connected (CONTENT), so a few spellings are accepted.
const contentUrl = process.env.CONTENT_DATABASE_URL || process.env.CONTENT_POSTGRES_URL || process.env.CONTENT_URL;

export const contentDbIsSeparate = !!contentUrl;

export const contentDb = globalForContent.prismaContent ?? new PrismaClient({ datasourceUrl: contentUrl || process.env.EMERGENCY_DATABASE_URL || process.env.EMERGENCY_POSTGRES_URL || process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalForContent.prismaContent = contentDb;
