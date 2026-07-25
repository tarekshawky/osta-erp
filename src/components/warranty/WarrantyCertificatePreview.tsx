import { OstaLogo } from "@/components/OstaLogo";
import { formatDate } from "@/lib/format";
import { WARRANTY_DAYS, TERMS_URL } from "@/lib/invoiceData";

export type WarrantyCertificateData = {
  date: Date;
  customerName: string;
  emirate: string | null;
  phone: string | null;
  address: string | null;
  serviceProvided: string;
  equipmentLocation: string | null;
  warrantyFrom: Date;
  warrantyTo: Date;
  teamName: string | null;
  teamSupervisor: string | null;
};

function MedalIcon() {
  return (
    <svg width="76" height="94" viewBox="0 0 72 88" fill="none">
      <path d="M20 52l-9 32 13-6.5 8.5 11 7-31z" fill="#0f2a63" />
      <path d="M52 52l9 32-13-6.5-8.5 11-7-31z" fill="#0f2a63" />
      <circle cx="36" cy="33" r="29" fill="#123a8c" stroke="#fbbf24" strokeWidth="3" />
      <circle cx="36" cy="33" r="22" fill="none" stroke="#fde68a" strokeWidth="1.5" />
      <path
        d="M36 19l3.6 7.6 8.4.9-6.1 5.9 1.6 8.3L36 37.8l-7.5 3.9 1.6-8.3-6.1-5.9 8.4-.9z"
        fill="#fbbf24"
      />
    </svg>
  );
}

function Row({ ar, en }: { ar: string; en: string }) {
  return (
    <div className="grid grid-cols-2 gap-6 py-2.5 border-b border-slate-100 last:border-0">
      <div dir="rtl" className="text-sm text-slate-700 text-right">
        {ar}
      </div>
      <div className="text-sm text-slate-700">{en}</div>
    </div>
  );
}

function SectionHeader({ ar, en }: { ar: string; en: string }) {
  return (
    <div className="grid grid-cols-2 gap-6 pt-5 pb-1.5">
      <div dir="rtl" className="text-sm font-bold text-blue-900 text-right border-b-2 border-amber-300 pb-1 inline-block">
        {ar}
      </div>
      <div className="text-sm font-bold text-blue-900 border-b-2 border-amber-300 pb-1 inline-block">{en}</div>
    </div>
  );
}

export function WarrantyCertificatePreview({
  data,
  innerRef,
}: {
  data: WarrantyCertificateData;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div ref={innerRef} className="rounded-2xl border-2 border-amber-300/50 bg-white overflow-hidden shadow-sm">
      <div className="relative bg-gradient-to-b from-blue-950 to-blue-900 px-8 sm:px-12 pt-9 pb-8 text-center">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-300" />
        <div className="text-3xl sm:text-4xl font-black tracking-tight text-amber-300">WARRANTY CERTIFICATE</div>
        <div className="text-xs sm:text-sm tracking-[0.35em] text-blue-200 mt-2 font-semibold">
          {WARRANTY_DAYS}-DAY PROTECTION
        </div>
        <div dir="rtl" className="mt-2 text-sm text-blue-200/80">
          شهادة ضمان خدمات آسطا
        </div>
      </div>

      <div className="flex flex-col items-center pt-6 pb-2">
        <MedalIcon />
        <div className="mt-3">
          <OstaLogo compact align="center" />
        </div>
        <p className="mt-3 text-sm text-slate-500 text-center max-w-md px-6">
          This certificate confirms the service below is covered by Osta Services&apos; official warranty.
        </p>
      </div>

      <div className="px-8 sm:px-12 pb-10">
        <div className="grid grid-cols-2 gap-6 text-xs text-slate-600 pt-4 border-t border-slate-100">
          <p dir="rtl" className="text-right">
            تشهد خدمات آسطا بأن الخدمة الموضحة أدناه قد تم تنفيذها بواسطة فريقنا الفني المتخصص بتاريخ:{" "}
            {formatDate(data.date)}
          </p>
          <p>
            Osta Services certifies that the service mentioned below has been completed by our professional
            technical team on: {formatDate(data.date)}
          </p>
        </div>

        <SectionHeader ar="بيانات العميل" en="Customer Information" />
        <Row ar={`اسم العميل: ${data.customerName}`} en={`Customer Name: ${data.customerName}`} />
        <Row ar={`الإمارة: ${data.emirate ?? "—"}`} en={`Emirate: ${data.emirate ?? "—"}`} />
        <Row ar={`رقم الهاتف: ${data.phone ?? "—"}`} en={`Phone Number: ${data.phone ?? "—"}`} />
        <Row ar={`العنوان: ${data.address ?? "—"}`} en={`Address: ${data.address ?? "—"}`} />

        <SectionHeader ar="تفاصيل الخدمة والضمان" en="Service & Warranty Details" />
        <Row ar={`الخدمة المقدمة: ${data.serviceProvided}`} en={`Service Provided: ${data.serviceProvided}`} />
        <Row
          ar={`الجهاز / الموقع: ${data.equipmentLocation ?? "—"}`}
          en={`Equipment / Location: ${data.equipmentLocation ?? "—"}`}
        />
        <Row
          ar={`مدة الضمان: من تاريخ ${formatDate(data.warrantyFrom)} إلى تاريخ ${formatDate(data.warrantyTo)}`}
          en={`Warranty Period: From ${formatDate(data.warrantyFrom)} To ${formatDate(data.warrantyTo)}`}
        />
        <div className="grid grid-cols-2 gap-6 py-2.5 text-xs text-slate-600">
          <p dir="rtl" className="text-right">
            تقدم خدمات آسطا ضمانًا لمدة <strong>{WARRANTY_DAYS} يومًا</strong> على الخدمة المنفذة فقط، ويشمل الضمان
            أي مشكلة مرتبطة مباشرة بالأعمال التي تم تنفيذها بواسطة فريقنا الفني وفقًا لشروط وأحكام الضمان.
          </p>
          <p>
            Osta Services provides a <strong>{WARRANTY_DAYS}-day warranty</strong> for the performed service only.
            The warranty covers issues directly related to the work completed by our technical team according to
            the warranty terms and conditions.
          </p>
        </div>

        <SectionHeader ar="بيانات فريق التنفيذ" en="Service Team Information" />
        <Row
          ar={`فريق التنفيذ: فريق آسطا - ${data.teamName ?? "—"}`}
          en={`Service Team: Osta Team - ${data.teamName ?? "—"}`}
        />
        <Row ar={`مسؤول الفريق: ${data.teamSupervisor ?? "—"}`} en={`Team Supervisor: ${data.teamSupervisor ?? "—"}`} />

        <SectionHeader ar="شروط وأحكام الضمان المختصرة" en="Warranty Terms & Conditions Summary" />
        <div className="grid grid-cols-2 gap-6 py-1.5 text-xs text-slate-600">
          <p dir="rtl" className="text-right">
            • الضمان يشمل الأعمال المنفذة فقط ولا يشمل الأعطال الجديدة أو سوء الاستخدام أو العوامل الخارجية.
          </p>
          <p>• Warranty applies only to the performed work and does not cover new faults, misuse, or external factors.</p>
        </div>
        <div className="grid grid-cols-2 gap-6 py-1.5 text-xs text-slate-600">
          <p dir="rtl" className="text-right">
            • يجب التواصل مع خدمات آسطا قبل أي إصلاح أو تدخل من طرف آخر، وإلا يعتبر الضمان ملغيًا.
          </p>
          <p>
            • Customers must contact Osta Services before any repair or intervention by another party, otherwise
            the warranty will be void.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 py-1.5 text-xs text-slate-600">
          <p dir="rtl" className="text-right">
            • لا يشمل الضمان قطع الغيار أو الأعطال غير المرتبطة مباشرة بالخدمة المقدمة.
          </p>
          <p>• Warranty does not cover spare parts or issues unrelated to the provided service.</p>
        </div>

        <div className="mt-5 pt-4 border-t-2 border-amber-300/50 grid grid-cols-2 gap-6 text-xs">
          <div dir="rtl" className="text-right">
            <div className="text-slate-500">للاطلاع على الشروط والأحكام الكاملة:</div>
            <div className="text-blue-700 mt-0.5">{TERMS_URL}</div>
          </div>
          <div>
            <div className="text-slate-500">For full warranty terms and conditions, please visit:</div>
            <div className="text-blue-700 mt-0.5">{TERMS_URL}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
