// Standalone one-off script -- NEVER imported by prisma/seed.ts, which opens with
// destructive deleteMany() calls across the whole DB. This script only does an
// idempotent upsert per vehicle plus an additive backfill of Expense.vehicleId for
// historical rows -- safe to re-run against the shared live DB.
//
// Run with: npx tsx scripts/seedVehiclesAndBackfill.ts
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const ADMIN_CODE = "ADM-001";

const VEHICLES = [
  {
    name: "MG ZST",
    owner: "AMR ABDELHAMID MAHMOUD MOHAMED",
    plateType: "خصوصي",
    plateNumber: "C/51563",
    licensingAuthority: "DUBAI",
    trafficCode: "17294947",
    licenseExpiry: new Date("2027-02-21T00:00:00Z"),
    insuranceExpiry: new Date("2027-03-21T00:00:00Z"),
    policyNumber: "260230023914",
    insuranceCompany: "شركة ميثاق",
    insuranceType: "ضد الغير",
    year: 2004,
    chassisNumber: "6T1BE32K14X434581",
  },
  {
    name: "Dodge Journey",
    owner: "AMR ABDELHAMID MAHMOUD MOHAMED",
    plateType: "خصوصي",
    plateNumber: "4/80635",
    licensingAuthority: "SHARJAH",
    trafficCode: "1190097360",
    licenseExpiry: new Date("2027-01-31T00:00:00Z"),
    insuranceExpiry: new Date("2027-02-28T00:00:00Z"),
    policyNumber: "15/4021/265/3304",
    insuranceCompany: "شركة التامين فيدلتي",
    insuranceType: "ضد الغير",
    year: 2018,
    chassisNumber: "3C4PDCGB6JT157922",
  },
  {
    name: "Toyota Camry",
    owner: "AMR ABDELHAMID MAHMOUD MOHAMED",
    plateType: "خصوصي",
    plateNumber: "10/67271",
    licensingAuthority: "ABU DHABI",
    trafficCode: "1190097360",
    licenseExpiry: new Date("2027-05-23T00:00:00Z"),
    insuranceExpiry: new Date("2027-06-23T00:00:00Z"),
    policyNumber: "5/4021/26S/15175",
    insuranceCompany: "شركة التامين فيدلتي",
    insuranceType: "ضد الغير",
    year: 2022,
    chassisNumber: "LSJW74C90NZ089383",
  },
  {
    name: "Toyota Yaris",
    owner: "AMR ABDELHAMID MAHMOUD MOHAMED",
    plateType: "خصوصي",
    plateNumber: "4/16314",
    licensingAuthority: "SHARJAH",
    trafficCode: "1190097360",
    licenseExpiry: new Date("2027-04-26T00:00:00Z"),
    insuranceExpiry: new Date("2027-05-26T00:00:00Z"),
    policyNumber: "209017902656068",
    insuranceCompany: "شركة الوثبة",
    insuranceType: "ضد الغير",
    year: 2006,
    chassisNumber: "JTDBW923761000597",
  },
];

async function main() {
  const admin = await prisma.employee.findUnique({ where: { code: ADMIN_CODE } });
  if (!admin) {
    throw new Error(`Admin employee ${ADMIN_CODE} not found -- cannot set createdById.`);
  }

  for (const v of VEHICLES) {
    const vehicle = await prisma.vehicle.upsert({
      where: { name: v.name },
      update: {},
      create: { ...v, createdById: admin.id },
    });
    console.log(`Vehicle upserted: ${vehicle.name} (${vehicle.id})`);

    const result = await prisma.expense.updateMany({
      where: { vehicle: v.name, vehicleId: null },
      data: { vehicleId: vehicle.id },
    });
    console.log(`  Backfilled ${result.count} historical Expense row(s) for "${v.name}"`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
