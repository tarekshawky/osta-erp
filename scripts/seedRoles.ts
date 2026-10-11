// Idempotent: upserts the six built-in permission roles by key. Safe to re-run;
// re-running resets a built-in role's permissions to the definitions in src/lib/permissions.ts.
import { prisma } from "../src/lib/prisma";
import { ROLE_DEFINITIONS } from "../src/lib/permissions";

async function main() {
  for (const r of ROLE_DEFINITIONS) {
    await prisma.adminRole.upsert({
      where: { key: r.key },
      update: { name: r.name, permissions: r.permissions },
      create: { key: r.key, name: r.name, permissions: r.permissions },
    });
  }
  console.log("roles:", (await prisma.adminRole.findMany({ select: { key: true } })).map((r) => r.key).join(", "));
}
main().finally(() => prisma.$disconnect());
