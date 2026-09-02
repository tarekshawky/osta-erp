import Link from "next/link";
import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { TopBar } from "@/components/TopBar";
import { WarrantyCertificateForm } from "./WarrantyCertificateForm";
import { getEmployeeLang, pickLang } from "@/lib/employeeLang";
import { tajawal } from "@/lib/fonts";

const T = {
  ar: { yourCertificates: "شهاداتك", empty: "لا توجد شهادات بعد." },
  en: { yourCertificates: "Your Certificates", empty: "No certificates created yet." },
} as const;

export default async function WarrantyCertificatePage() {
  const employee = await requireEmployee("EMPLOYEE");
  const lang = await getEmployeeLang();
  const s = pickLang(lang, T);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? tajawal.className : "";

  const certificates = await prisma.warrantyCertificate.findMany({
    where: { createdById: employee.id },
    orderBy: { date: "desc" },
  });

  return (
    <div className="pb-8">
      <TopBar title={{ ar: "شهادة الضمان", en: "Warranty Certificate" }} />
      <WarrantyCertificateForm detailPathPrefix="/employee/warranty-certificate" />
      <div className="px-5 mt-2">
        <h2 className={`text-sm font-semibold text-slate-700 mb-2 ${font}`} dir={dir}>
          {s.yourCertificates}
        </h2>
        <div className="flex flex-col gap-3">
          {certificates.map((c) => (
            <Link
              key={c.id}
              href={`/employee/warranty-certificate/${c.id}`}
              className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-slate-900 text-sm">{c.customerName}</div>
                <div className="text-xs text-slate-500 mt-0.5">{c.serviceProvided}</div>
              </div>
              <div className="text-xs text-slate-400 whitespace-nowrap">{formatDate(c.date)}</div>
            </Link>
          ))}
          {certificates.length === 0 && (
            <p className={`text-center text-sm text-slate-400 py-8 ${font}`} dir={dir}>
              {s.empty}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
