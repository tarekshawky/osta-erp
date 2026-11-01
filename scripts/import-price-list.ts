// Loads data/price-list.json (the Osta Services master price list) into Dynamic Pricing. `--dry` shows what would change and writes nothing.
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { applyPriceList, type PriceListData } from "../src/lib/pricing/priceList";

async function main() {
  const data: PriceListData = JSON.parse(readFileSync(new URL("../data/price-list.json", import.meta.url), "utf8"));
  const r = await applyPriceList(data, { dryRun: process.argv.includes("--dry") });
  console.log({ ...r, notFound: r.notFound, conflicts: r.conflicts, changedExisting: r.changedExisting.slice(0, 40), changedExistingCount: r.changedExisting.length });
}
main().finally(() => prisma.$disconnect());
