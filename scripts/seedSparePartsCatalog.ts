// Standalone, idempotent seed for the Master Spare Parts Catalog spec.
// Never imported by prisma/seed.ts (which destructively deleteMany()s across
// the whole DB) -- safe to re-run against the shared live DB at any time.
// Upserts by `sku` (InventoryItem), `name` (Warehouse), and `code` (LabourItem).
import { prisma } from "../src/lib/prisma";
import { WAREHOUSE_SEED_NAMES, INVENTORY_CATEGORIES } from "../src/lib/inventoryData";

type Row = {
  sku: string;
  nameAr: string | null;
  name: string;
  category: string;
  subcategory: string | null;
  specification: string | null;
  unit: string;
};

const EL = "Electrical & Control Parts";
const CT = "Sensors & PCB";
const MT = "Motors & Fans";
const CM = "Compressors";
const CU = "Copper Pipes & Insulation";
const RF = "Refrigeration Components";
const GS = "Refrigerants";
const DR = "Drainage Parts";
const IN = "Split AC Installation Parts";
const CA = "Central AC/FCU/AHU Parts";
const DC = "Duct AC Parts";
const GE = "General Electrical Parts";

for (const c of [EL, CT, MT, CM, CU, RF, GS, DR, IN, CA, DC, GE]) {
  if (!(INVENTORY_CATEGORIES as readonly string[]).includes(c)) {
    throw new Error(`Category "${c}" is missing from INVENTORY_CATEGORIES -- run Chunk 1's schema migration first.`);
  }
}

// Generates one row per spec in `specs`, sequentially numbered from `start`.
function series(
  prefix: string,
  start: number,
  nameAr: string,
  name: string,
  category: string,
  subcategory: string | null,
  specs: string[],
  unit = "Piece"
): Row[] {
  return specs.map((specification, i) => ({
    sku: `${prefix}-${String(start + i).padStart(3, "0")}`,
    nameAr,
    name,
    category,
    subcategory,
    specification,
    unit,
  }));
}

// Generates one row per [nameAr, name, specification] triple in `items`.
function table(
  prefix: string,
  start: number,
  category: string,
  subcategory: string | null,
  items: [string | null, string, string | null][],
  unit = "Piece"
): Row[] {
  return items.map(([nameAr, name, specification], i) => ({
    sku: `${prefix}-${String(start + i).padStart(3, "0")}`,
    nameAr,
    name,
    category,
    subcategory,
    specification,
    unit,
  }));
}

const rows: Row[] = [
  // --- 3. Electrical & Control Parts (AC-EL-001..045) ---
  ...series("AC-EL", 1, "مكثف تشغيل", "Run Capacitor", EL, "Run Capacitors", [
    "2 µF / 450V", "2.5 µF / 450V", "3 µF / 450V", "4 µF / 450V", "5 µF / 450V",
    "6 µF / 450V", "7.5 µF / 450V", "10 µF / 450V", "12.5 µF / 450V", "15 µF / 450V",
    "20 µF / 450V", "25 µF / 450V", "30 µF / 450V", "35 µF / 450V", "40 µF / 450V",
    "45 µF / 450V", "50 µF / 450V", "60 µF / 450V", "70 µF / 450V", "80 µF / 450V",
  ]),
  ...series("AC-EL", 21, "مكثف كمبروسر", "Compressor Capacitor", EL, "Compressor Capacitors", [
    "25+5 µF / 450V", "30+5 µF / 450V", "35+5 µF / 450V", "40+5 µF / 450V", "45+5 µF / 450V", "50+5 µF / 450V",
  ]),
  ...table("AC-EL", 27, EL, "Starting & Protection Components", [
    ["ريليه تشغيل كمبروسر", "Compressor Start Relay", "Universal"],
    ["أوفرلود كمبروسر", "Compressor Overload", "حسب الأمبير"],
    ["كونتاكتور", "Contactor", "16A"],
    ["كونتاكتور", "Contactor", "25A"],
    ["كونتاكتور", "Contactor", "32A"],
    ["كونتاكتور", "Contactor", "40A"],
    ["كونتاكتور", "Contactor", "50A"],
    ["كونتاكتور", "Contactor", "63A"],
    ["ريليه حماية فاز", "Phase Protection Relay", "220–240V"],
    ["ريليه حماية فاز", "Phase Protection Relay", "380–415V"],
  ]),
  ...series("AC-EL", 37, "قاطع كهرباء", "MCB", EL, "MCB", [
    "6A", "10A", "16A", "20A", "25A", "32A", "40A", "50A", "63A",
  ]),

  // --- 4. Sensors & PCB (AC-CT-001..016) ---
  ...table("AC-CT", 1, CT, null, [
    ["حساس حرارة الغرفة", "Room Temperature Sensor", "5KΩ"],
    ["حساس حرارة الغرفة", "Room Temperature Sensor", "10KΩ"],
    ["حساس المبخر", "Evaporator Sensor", "5KΩ"],
    ["حساس المبخر", "Evaporator Sensor", "10KΩ"],
    ["حساس المكثف", "Condenser Sensor", "5KΩ"],
    ["حساس المكثف", "Condenser Sensor", "10KΩ"],
    ["حساس ضغط", "Pressure Sensor", "حسب الموديل"],
    ["حساس مستوى المياه", "Float Switch", "Universal"],
    ["بورد تكييف سبليت", "Split AC PCB", "Universal"],
    ["بورد داخلي", "Indoor PCB", "حسب الموديل"],
    ["بورد خارجي", "Outdoor PCB", "حسب الموديل"],
    ["بورد إنفرتر", "Inverter PCB", "حسب الموديل"],
    ["بورد باور", "Power PCB", "حسب الموديل"],
    ["ريموت تكييف", "AC Remote Control", "Universal"],
    ["مستقبل ريموت", "IR Receiver", "Universal"],
    ["شاشة تكييف", "Display Board", "حسب الموديل"],
  ]),

  // --- 5. Motors & Fans (AC-MT-001..014) ---
  ...table("AC-MT", 1, MT, null, [
    ["موتور مروحة داخلي", "Indoor Fan Motor", "220–240V"],
    ["موتور مروحة داخلي", "Indoor Fan Motor", "12W"],
    ["موتور مروحة داخلي", "Indoor Fan Motor", "18W"],
    ["موتور مروحة داخلي", "Indoor Fan Motor", "25W"],
    ["موتور مروحة داخلي", "Indoor Fan Motor", "35W"],
    ["موتور مروحة داخلي", "Indoor Fan Motor", "45W"],
    ["موتور مروحة خارجي", "Outdoor Fan Motor", "220–240V"],
    ["موتور مروحة خارجي", "Outdoor Fan Motor", "30W"],
    ["موتور مروحة خارجي", "Outdoor Fan Motor", "50W"],
    ["موتور مروحة خارجي", "Outdoor Fan Motor", "80W"],
    ["موتور مروحة خارجي", "Outdoor Fan Motor", "120W"],
    ["مروحة بلاور", "Indoor Blower Fan", "حسب المقاس"],
    ["ريشة مروحة خارجية", "Outdoor Fan Blade", "12–18 inch"],
    ["ريشة مروحة خارجية", "Outdoor Fan Blade", "18–24 inch"],
  ]),

  // --- 6. Compressors (AC-CM-001..009) ---
  ...series("AC-CM", 1, "كمبروسر روتاري", "Rotary Compressor", CM, "Rotary Compressors", [
    "9,000 BTU", "12,000 BTU", "18,000 BTU", "24,000 BTU", "30,000 BTU", "36,000 BTU",
  ]),
  ...series("AC-CM", 7, "كمبروسر سكرول", "Scroll Compressor", CM, "Scroll Compressors", [
    "36,000 BTU", "48,000 BTU", "60,000 BTU",
  ]),

  // --- 7. Copper Pipes & Insulation (AC-CU-001..014) ---
  ...series("AC-CU", 1, "ماسورة نحاس", "Copper Pipe", CU, "Copper Pipes", [
    "1/4\"", "3/8\"", "1/2\"", "5/8\"", "3/4\"", "7/8\"", "1-1/8\"", "1-3/8\"",
  ], "Meter"),
  ...series("AC-CU", 9, "عازل مواسير نحاس", "Copper Pipe Insulation", CU, "Insulation", [
    "1/4\"", "3/8\"", "1/2\"", "5/8\"", "3/4\"", "7/8\"",
  ]),

  // --- 8. Refrigeration Components (AC-RF-001..012) ---
  ...table("AC-RF", 1, RF, null, [
    ["فلتر دراير", "Filter Drier", "1/4\""],
    ["فلتر دراير", "Filter Drier", "3/8\""],
    ["فلتر دراير", "Filter Drier", "1/2\""],
    ["كابلري", "Capillary Tube", "حسب BTU"],
    ["صمام تمدد", "Expansion Valve", "حسب BTU"],
    ["بلف خدمة", "Service Valve", "1/4\""],
    ["بلف خدمة", "Service Valve", "3/8\""],
    ["بلف خدمة", "Service Valve", "1/2\""],
    ["بلف شريدر", "Schrader Valve", "1/4\""],
    ["قلب بلف شريدر", "Schrader Valve Core", "Universal"],
    ["غطاء بلف", "Valve Cap", "1/4\""],
    ["سولينويد فالف", "Solenoid Valve", "حسب المقاس"],
  ]),

  // --- 9. Refrigerants (AC-GS-001..006) -- sold in decimal KG quantities ---
  ...table("AC-GS", 1, GS, null, [
    ["غاز تبريد", "Refrigerant Gas", "R22"],
    ["غاز تبريد", "Refrigerant Gas", "R410A"],
    ["غاز تبريد", "Refrigerant Gas", "R32"],
    ["غاز تبريد", "Refrigerant Gas", "R134a"],
    ["غاز تبريد", "Refrigerant Gas", "R407C"],
    ["غاز تبريد", "Refrigerant Gas", "R404A"],
  ], "Kg"),

  // --- 10. Drainage Parts (AC-DR-001..013) ---
  ...table("AC-DR", 1, DR, null, [
    ["خرطوم صرف", "Drain Hose", "16mm"],
    ["خرطوم صرف", "Drain Hose", "20mm"],
    ["خرطوم صرف", "Drain Hose", "25mm"],
    ["ماسورة صرف PVC", "PVC Drain Pipe", "25mm"],
    ["ماسورة صرف PVC", "PVC Drain Pipe", "32mm"],
    ["ماسورة صرف PVC", "PVC Drain Pipe", "40mm"],
    ["طلمبة صرف", "Drain Pump", "Mini"],
    ["طلمبة صرف", "Drain Pump", "Heavy Duty"],
    ["عوامة صرف", "Drain Float Switch", "Universal"],
    ["كوع صرف", "PVC Drain Elbow", "25mm"],
    ["كوع صرف", "PVC Drain Elbow", "32mm"],
    ["وصلة صرف", "PVC Coupling", "25mm"],
    ["وصلة صرف", "PVC Coupling", "32mm"],
  ]),

  // --- 11. Split AC Installation Parts (AC-IN-001..021) ---
  ...table("AC-IN", 1, IN, null, [
    ["قاعدة وحدة خارجية", "Outdoor Unit Bracket", "18\""],
    ["قاعدة وحدة خارجية", "Outdoor Unit Bracket", "20\""],
    ["قاعدة وحدة خارجية", "Outdoor Unit Bracket", "24\""],
    ["قاعدة وحدة خارجية", "Outdoor Unit Bracket", "Heavy Duty"],
    ["قاعدة أرضية", "Outdoor Floor Stand", "حسب المقاس"],
    ["مسمار تثبيت", "Expansion Bolt", "8mm"],
    ["مسمار تثبيت", "Expansion Bolt", "10mm"],
    ["مسمار تثبيت", "Expansion Bolt", "12mm"],
    ["شريط عزل", "Insulation Tape", "2\""],
    ["شريط PVC", "PVC Wrapping Tape", "2\""],
    ["كابل تكييف", "AC Cable", "3×2.5mm²"],
    ["كابل تكييف", "AC Cable", "3×4mm²"],
    ["كابل تكييف", "AC Cable", "3×6mm²"],
    ["كابل تكييف", "AC Cable", "4×4mm²"],
    ["كابل كنترول", "Control Cable", "4 Core"],
    ["كابل كنترول", "Control Cable", "6 Core"],
    ["ترامل نحاس", "Copper Lugs", "2.5mm²"],
    ["ترامل نحاس", "Copper Lugs", "4mm²"],
    ["ترامل نحاس", "Copper Lugs", "6mm²"],
    ["ترامل نحاس", "Copper Lugs", "10mm²"],
    ["ترامل نحاس", "Copper Lugs", "16mm²"],
  ]),

  // --- 12. Central AC/FCU/AHU Parts (AC-CA-001..022) --
  // Spec gives item names only (no explicit size/spec table) -- these seed as
  // the catalog's starting template rows; Admin adds Size/Spec/Brand/Model
  // variants per product from the Admin Panel per the spec's own instruction.
  ...table("AC-CA", 1, CA, null, [
    ["فلتر هواء", "Air Filter", null],
    ["فلتر قابل للغسيل", "Washable Filter", null],
    ["فلتر Pleated", "Pleated Air Filter", null],
    ["موتور AHU", "AHU Motor", null],
    ["موتور FCU", "FCU Motor", null],
    ["بلف 2 Way", "2-Way Valve", null],
    ["بلف 3 Way", "3-Way Valve", null],
    ["Actuator", "Valve Actuator", null],
    ["Thermostat", "Digital Thermostat", null],
    ["Thermostat", "FCU Thermostat", null],
    [null, "Differential Pressure Switch", null],
    [null, "Air Pressure Sensor", null],
    [null, "Temperature Sensor", null],
    [null, "Fan Belt", null],
    [null, "Pulley", null],
    [null, "Bearing", null],
    [null, "Blower Wheel", null],
    [null, "Flexible Connection", null],
    [null, "Vibration Isolator", null],
    [null, "Drain Pan", null],
    [null, "Drain Trap", null],
    [null, "Strainer", null],
  ]),

  // --- 13. Duct AC Parts (AC-DC-001..019) -- same "starting template" note as above ---
  ...table("AC-DC", 1, DC, null, [
    ["عازل دكت", "Duct Insulation", null],
    ["بطانة دكت", "Duct Liner", null],
    ["شريط دكت", "Duct Tape", null],
    ["شريط ألمنيوم", "Aluminium Foil Tape", null],
    ["مادة عزل دكت", "Duct Sealant", null],
    ["دكت مرن", "Flexible Duct", null],
    ["وصلة دكت مرن", "Flexible Duct Connector", null],
    ["دامبر تحكم", "Volume Control Damper", null],
    [null, "Fire Damper", null],
    [null, "Motorized Damper", null],
    [null, "Access Door", null],
    [null, "Supply Air Grille", null],
    [null, "Return Air Grille", null],
    [null, "Diffuser", null],
    [null, "Linear Diffuser", null],
    [null, "Exhaust Grille", null],
    [null, "Duct Collar", null],
    [null, "Duct Flange", null],
    [null, "Canvas Connector", null],
  ]),

  // --- 14. General Electrical Parts (AC-GE-001..035) ---
  ...table("AC-GE", 1, GE, null, [
    ["فيوز", "Fuse", "3A"],
    ["فيوز", "Fuse", "5A"],
    ["فيوز", "Fuse", "10A"],
    ["فيوز", "Fuse", "15A"],
    ["فيوز", "Fuse", "20A"],
    ["فيوز", "Fuse", "30A"],
    ["ترامل", "Terminal Block", "حسب المقاس"],
    ["كونيكتور", "Wire Connector", "حسب المقاس"],
    ["كابل كهرباء", "Electrical Cable", "حسب المقطع"],
    ["سلك كهرباء", "Electrical Wire", "حسب المقطع"],
    ["تايمر", "Timer", "Universal"],
    ["مفتاح عزل", "Isolator Switch", "20A"],
    ["مفتاح عزل", "Isolator Switch", "32A"],
    ["مفتاح عزل", "Isolator Switch", "40A"],
    ["مفتاح عزل", "Isolator Switch", "63A"],
    ["مفتاح تشغيل", "On/Off Switch", "Universal"],
    ["فيشة", "Plug", "13A"],
    ["Cable Tie", "Cable Tie", "100mm"],
    ["Cable Tie", "Cable Tie", "200mm"],
    ["Cable Tie", "Cable Tie", "300mm"],
    ["مسمار", "Screw", "4mm"],
    ["مسمار", "Screw", "5mm"],
    ["مسمار", "Screw", "6mm"],
    ["قاعدة مطاط", "Rubber Mount", "Small"],
    ["قاعدة مطاط", "Rubber Mount", "Medium"],
    ["قاعدة مطاط", "Rubber Mount", "Large"],
    ["قاعدة مانعة للاهتزاز", "Anti-Vibration Pad", "حسب المقاس"],
    ["سيليكون", "Silicone Sealant", "Standard"],
    ["غراء PVC", "PVC Glue", "Standard"],
    ["قضيب لحام نحاس", "Copper Welding Rod", "Standard"],
    ["قضيب لحام فضة", "Silver Brazing Rod", "Standard"],
    ["منظم نيتروجين", "Nitrogen Regulator", "Standard"],
    ["خرطوم فريون", "Refrigerant Hose", "Standard"],
    ["خرطوم شحن", "Charging Hose", "Standard"],
    ["أداة قلب شريدر", "Schrader Core Tool", "Standard"],
  ]),
];

const labourItems = [
  { code: "LAB-001", nameAr: "أعمال صيانة بسيطة", nameEn: "Basic Maintenance Work", defaultPrice: 120 },
  { code: "LAB-002", nameAr: "أعمال صيانة متوسطة", nameEn: "Medium Maintenance Work", defaultPrice: 350 },
  { code: "LAB-003", nameAr: "أعمال صيانة متقدمة", nameEn: "Advanced Maintenance Work", defaultPrice: 500 },
];

async function main() {
  const dupSkus = rows.map((r) => r.sku).filter((sku, i, arr) => arr.indexOf(sku) !== i);
  if (dupSkus.length > 0) throw new Error(`Duplicate SKUs in seed data: ${dupSkus.join(", ")}`);

  const admin = await prisma.employee.findFirstOrThrow({ where: { role: "ADMIN" } });

  let warehousesCreated = 0;
  for (const name of WAREHOUSE_SEED_NAMES) {
    const res = await prisma.warehouse.upsert({
      where: { name },
      update: {},
      create: { name, status: "Active" },
    });
    if (res.createdAt.getTime() > Date.now() - 5000) warehousesCreated++;
  }

  let itemsCreated = 0;
  let itemsSkipped = 0;
  for (const row of rows) {
    const existing = await prisma.inventoryItem.findUnique({ where: { sku: row.sku } });
    if (existing) {
      itemsSkipped++;
      continue;
    }
    await prisma.inventoryItem.create({
      data: {
        name: row.name,
        nameAr: row.nameAr,
        sku: row.sku,
        specification: row.specification,
        unit: row.unit,
        category: row.category,
        subcategory: row.subcategory,
        status: "Active",
        minimumMainStock: 0,
        createdById: admin.id,
      },
    });
    itemsCreated++;
  }

  let labourCreated = 0;
  let labourSkipped = 0;
  for (const l of labourItems) {
    const existing = await prisma.labourItem.findUnique({ where: { code: l.code } });
    if (existing) {
      labourSkipped++;
      continue;
    }
    await prisma.labourItem.create({
      data: { code: l.code, nameAr: l.nameAr, nameEn: l.nameEn, defaultPrice: l.defaultPrice, status: "Active", createdById: admin.id },
    });
    labourCreated++;
  }

  console.log(`Warehouses: ${warehousesCreated} created (of ${WAREHOUSE_SEED_NAMES.length} target)`);
  console.log(`Spare parts: ${itemsCreated} created, ${itemsSkipped} already existed (total in seed data: ${rows.length})`);
  console.log(`Labour items: ${labourCreated} created, ${labourSkipped} already existed`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
