import { defineConfig } from "prisma/config";

// Replaces the "prisma" block of package.json (deprecated in Prisma 7). With a config file Prisma no longer reads .env by
// itself, so load it here; on Vercel the variables come from the project settings and there is no .env file.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env file
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { seed: "tsx prisma/seed.ts" },
});
