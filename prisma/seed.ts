import { PrismaClient } from "../src/generated/prisma";
import { createHash } from "crypto";
import { EMIRATES, SERVICE_CATALOG, CATEGORIES, WARRANTY_DAYS, type Category } from "../src/lib/invoiceData";
import { EXPENSE_CATEGORIES } from "../src/lib/expenseData";

const prisma = new PrismaClient();

const SECRET = process.env.AUTH_SECRET ?? "insecure-dev-secret";
function hashPin(pin: string) {
  return createHash("sha256").update(`${SECRET}:${pin}`).digest("hex");
}

function daysAgo(n: number) {
  const d = new Date("2026-07-23T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(min: number, max: number) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

async function main() {
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.team.deleteMany();

  const ajman = await prisma.team.create({ data: { name: "Ajman" } });
  const alAin = await prisma.team.create({ data: { name: "Al Ain" } });
  const admin = await prisma.team.create({ data: { name: "Admin" } });

  const amr = await prisma.employee.create({
    data: {
      code: "ADM-001",
      name: "Amr Abdelhamid Mahmoud Mohamed",
      jobTitle: "CEO & Co-Founder",
      role: "ADMIN",
      pinHash: hashPin("1000"),
      status: "active",
      custody: 0,
      teamId: admin.id,
    },
  });

  const mostafa = await prisma.employee.create({
    data: {
      code: "TL-AJM-001",
      name: "Mostafa Yasser Ahmed Ali",
      jobTitle: "Team Leader",
      role: "EMPLOYEE",
      pinHash: hashPin("1991"),
      status: "active",
      custody: 4000,
      teamId: ajman.id,
    },
  });

  await prisma.employee.create({
    data: {
      code: "TEC-AJM-002",
      name: "Ramy Eid Salah Mohamed",
      jobTitle: "Technician",
      role: "EMPLOYEE",
      pinHash: hashPin("1002"),
      status: "inactive",
      custody: 0,
      teamId: ajman.id,
    },
  });

  const mohamedElSayed = await prisma.employee.create({
    data: {
      code: "MGR-AJM-001",
      name: "Mohamed El Sayed Mohamed Mahmoud",
      jobTitle: "HVAC Manager",
      role: "EMPLOYEE",
      pinHash: hashPin("1003"),
      status: "active",
      custody: 0,
      teamId: ajman.id,
    },
  });

  const tarek = await prisma.employee.create({
    data: {
      code: "OPS-AIN-001",
      name: "Tarek Shawky Ahmed Mohamed Shawarib",
      jobTitle: "Operations Manager",
      role: "EMPLOYEE",
      pinHash: hashPin("1005"),
      status: "active",
      custody: 3000,
      teamId: alAin.id,
    },
  });

  await prisma.employee.create({
    data: {
      code: "DRV-AIN-001",
      name: "Ali Mohamed Abdelaziz Mohamed",
      jobTitle: "Driver",
      role: "EMPLOYEE",
      pinHash: hashPin("1006"),
      status: "active",
      custody: 0,
      teamId: alAin.id,
    },
  });

  await prisma.employee.create({
    data: {
      code: "TEC-AIN-001",
      name: "Mohamed Ahmed Abdelaziz Alwardi",
      jobTitle: "HVAC Technician",
      role: "EMPLOYEE",
      pinHash: hashPin("1007"),
      status: "active",
      custody: 0,
      teamId: alAin.id,
    },
  });

  const customerSeeds = [
    { name: "Haitham", phone: "501110001" },
    { name: "Said Abdulah", phone: "501110002" },
    { name: "Frontline Freight", phone: "501110003", type: "COMPANY" as const, companyName: "Frontline Freight LLC" },
    { name: "Mohammad Homoud", phone: "501110004" },
    { name: "Ahmed Aldarei", phone: "501110005" },
    { name: "Khushal Khan", phone: "501110006" },
    { name: "Dr Amal", phone: "501110007" },
    { name: "Shabin Shareef", phone: "501110008" },
    { name: "Al Noor Trading", phone: "501110009", type: "COMPANY" as const, companyName: "Al Noor Trading LLC" },
    { name: "Fatima Al Suwaidi", phone: "501110010" },
    { name: "0505555909", phone: "505555909" },
    { name: "B9-1203", phone: "501110011" },
  ];

  const customers = [];
  for (const c of customerSeeds) {
    customers.push(
      await prisma.customer.create({
        data: {
          name: c.name,
          phone: c.phone,
          type: c.type ?? "INDIVIDUAL",
          companyName: c.companyName ?? null,
          emirate: pick(EMIRATES),
          buildingName: Math.random() > 0.4 ? "Marina Tower" : null,
          flatNo: Math.random() > 0.4 ? String(Math.floor(100 + Math.random() * 900)) : null,
        },
      })
    );
  }

  const invoiceCreators = [
    { employee: mostafa, team: ajman },
    { employee: mohamedElSayed, team: ajman },
    { employee: tarek, team: alAin },
    { employee: amr, team: admin },
  ];

  const payments = ["Ziina", "Ziina", "Cash", "Bank Transfer"];

  let invoiceSeq = 1;
  const year = 2026;
  for (let i = 0; i < 40; i++) {
    const creator = pick(invoiceCreators);
    const status = i < 36 ? "Paid" : i < 38 ? "Refunded" : "Pending";
    const category: Category = pick(CATEGORIES);
    const services = SERVICE_CATALOG[category].filter((s) => !s.startsWith("Custom"));
    const serviceType = pick(["Repair", "Inspection"] as const);
    const date = daysAgo(Math.floor(Math.random() * 20));
    const unitPrice = randomAmount(50, 1500);
    const warrantyUntil = new Date(date);
    warrantyUntil.setUTCDate(warrantyUntil.getUTCDate() + WARRANTY_DAYS);

    const invoice = await prisma.invoice.create({
      data: {
        number: `INV-${year}-${String(invoiceSeq++).padStart(6, "0")}`,
        date,
        customerId: pick(customers).id,
        serviceType,
        category,
        payment: pick(payments),
        amount: unitPrice,
        status,
        refundedAmount: status === "Refunded" ? unitPrice : 0,
        warrantyUntil,
        teamId: creator.team.id,
        createdById: creator.employee.id,
      },
    });

    await prisma.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        serviceName: pick(services),
        qty: 1,
        unitPrice,
      },
    });
  }

  const expenseCreators = [mostafa, tarek, mohamedElSayed, amr];
  const expensePayments = ["Cash", "Cash", "Bank", "Ziina"];
  const expenseByCategory: Record<string, string[]> = {
    Fuel: ["Emarat", "Adnoc", "Enoc"],
    Parking: ["Mall Parking", "RTA Parking"],
    Salik: ["Salik Toll"],
    Tools: ["Tools World", "Al Futtaim Tools"],
    Materials: ["Cool Sales", "Muhammad Tahir", "Gulf Materials"],
    Office: ["Office Depot", "Stationery World"],
    "Spare Parts": ["Union Coop Parts", "AC Spares Co"],
    Other: ["MetaPay - Advertising", "Misc Vendor"],
  };

  for (let i = 0; i < 24; i++) {
    const creator = pick(expenseCreators);
    const category = pick(EXPENSE_CATEGORIES);
    const amount = randomAmount(20, 1200);
    const status = i < 21 ? "Recorded" : i < 23 ? "Partially Refunded" : "Refunded";
    const refundedAmount = status === "Refunded" ? amount : status === "Partially Refunded" ? randomAmount(5, amount / 2) : 0;
    await prisma.expense.create({
      data: {
        date: daysAgo(Math.floor(Math.random() * 20)),
        description: pick(expenseByCategory[category]),
        category,
        payment: pick(expensePayments),
        amount,
        status,
        refundedAmount,
        teamId: creator.teamId,
        createdById: creator.id,
      },
    });
  }

  console.log("Seed complete.");
  console.log(`Employees: ${await prisma.employee.count()}`);
  console.log(`Customers: ${await prisma.customer.count()}`);
  console.log(`Invoices: ${await prisma.invoice.count()}`);
  console.log(`Expenses: ${await prisma.expense.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
