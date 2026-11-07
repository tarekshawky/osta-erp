import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CustomerPurchaseForm, type PurchaseFormInitial } from "@/components/expense/CustomerPurchaseForm";

export default async function EditCustomerPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireEmployee("ADMIN");
  const p = await prisma.customerPurchase.findUnique({ where: { id }, include: { items: true, customer: true, order: { select: { id: true, number: true } } } });
  if (!p) notFound();
  if (p.status === "Approved" && admin.role !== "SUPER_ADMIN") redirect(`/admin/expenses/purchases/${id}`);
  const [teams, employees, cards] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.employee.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.creditCard.findMany({ where: { status: "Active" }, orderBy: { name: "asc" }, select: { id: true, name: true, lastFour: true } }),
  ]);
  const initial: PurchaseFormInitial = {
    id: p.id,
    customer: { id: p.customer.id, name: p.customer.type === "COMPANY" ? p.customer.companyName || p.customer.name : p.customer.name, code: p.customer.code, phone: p.customer.phone, emirate: p.customer.emirate },
    order: p.order ? { id: p.order.id, number: p.order.number } : null,
    purchaseDate: p.purchaseDate.toISOString().slice(0, 10), supplierName: p.supplierName ?? "", supplierInvoiceNo: p.supplierInvoiceNo ?? "", paymentMethod: p.paymentMethod,
    creditCardId: p.creditCardId ?? "", notes: p.notes ?? "", supplierInvoiceUrl: p.supplierInvoiceUrl, teamId: p.teamId ?? "", technicianId: p.technicianId ?? "", emirate: p.emirate ?? "",
    lockPayment: p.status === "Approved",
    lines: p.items.map((i) => ({ name: i.name, description: i.description ?? "", qty: String(i.qty), unitPrice: String(i.unitPrice), supplier: i.supplier ?? "", supplierInvoiceNo: i.supplierInvoiceNo ?? "" })),
  };
  return (
    <div className="pb-10">
      <AdminTopBar title={`Edit ${p.number}`} hideMonth />
      <div className="px-4 py-6 sm:px-6">
        <CustomerPurchaseForm mode="edit" initial={initial} teams={teams} employees={employees} cards={cards} />
      </div>
    </div>
  );
}
