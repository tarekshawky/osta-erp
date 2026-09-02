import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/TopBar";
import { NewExpenseForm } from "./NewExpenseForm";
import { getVehicleCurrentOdometer } from "@/lib/vehicleData";

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [activeCards, vehicles] = await Promise.all([
    prisma.creditCard.findMany({
      where: { status: "Active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, cardHolder: true, lastFour: true },
    }),
    prisma.vehicle.findMany({ where: { status: "Active" }, orderBy: { name: "asc" } }),
  ]);
  const vehicleOptions = await Promise.all(
    vehicles.map(async (v) => ({
      id: v.id,
      name: v.name,
      currentOdometer: await getVehicleCurrentOdometer(v.id, v.initialOdometer),
    }))
  );

  return (
    <div className="pb-8">
      <TopBar title={{ ar: "إضافة مصروف", en: "Add Expense" }} />
      {error && (
        <p className="text-sm text-red-500 px-5 pt-4">
          {error === "duplicate"
            ? "This identical expense has already been recorded for this date."
            : "Please fill in all fields with a valid amount."}
        </p>
      )}
      <NewExpenseForm activeCards={activeCards} vehicleOptions={vehicleOptions} />
    </div>
  );
}
