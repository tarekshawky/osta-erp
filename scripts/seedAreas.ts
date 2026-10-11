// Idempotent: one service area per emirate (matching the pricing regions), created only if missing.
import { prisma } from "../src/lib/prisma";

const EMIRATES: [string, number, number][] = [
  ["dubai", 25.2048, 55.2708], ["abu-dhabi", 24.4539, 54.3773], ["sharjah", 25.3463, 55.4209], ["ajman", 25.4052, 55.5136],
  ["al-ain", 24.2075, 55.7447], ["ras-al-khaimah", 25.7895, 55.9432], ["umm-al-quwain", 25.5647, 55.5534], ["fujairah", 25.1288, 56.3265],
];

async function main() {
  for (const [i, [slug, lat, lng]] of EMIRATES.entries()) {
    const region = await prisma.region.findUnique({ where: { slug } });
    if (!region || (await prisma.serviceArea.findUnique({ where: { slug } }))) continue;
    await prisma.serviceArea.create({
      data: { regionId: region.id, slug, nameEn: region.nameEn, nameAr: region.nameAr, kind: "emirate", latitude: lat, longitude: lng, mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, sortOrder: i },
    });
  }
  console.log("service areas:", await prisma.serviceArea.count());
}
main().finally(() => prisma.$disconnect());
