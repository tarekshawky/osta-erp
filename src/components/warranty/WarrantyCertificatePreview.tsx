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

function Row({ ar, en }: { ar: string; en: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-100 last:border-0">
      <div dir="rtl" className="text-sm text-slate-700 text-right">
        {ar}
      </div>
      <div className="text-sm text-slate-700">{en}</div>
    </div>
  );
}

function SectionHeader({ ar, en }: { ar: string; en: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 pt-4 pb-1">
      <div dir="rtl" className="text-sm font-bold text-blue-900 text-right">
        {ar}
      </div>
      <div className="text-sm font-bold text-blue-900">{en}</div>
    </div>
  );
}

export function WarrantyCertificatePreview({ data, innerRef }: { data: WarrantyCertificateData; innerRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={innerRef} className="rounded-xl border-2 border-blue-900/20 bg-white p-6">
      <div className="flex justify-center">
        <OstaLogo align="center" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 text-center">
        <div dir="rtl" className="font-bold text-blue-950">
          شهادة ضمان خدمات آسطا
        </div>
        <div className="font-bold text-blue-950">Osta Services Warranty Certificate</div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-slate-600">
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
      <div className="grid grid-cols-2 gap-4 py-2 text-xs text-slate-600">
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
      <Row ar={`فريق التنفيذ: فريق آسطا - ${data.teamName ?? "—"}`} en={`Service Team: Osta Team - ${data.teamName ?? "—"}`} />
      <Row ar={`مسؤول الفريق: ${data.teamSupervisor ?? "—"}`} en={`Team Supervisor: ${data.teamSupervisor ?? "—"}`} />

      <SectionHeader ar="شروط وأحكام الضمان المختصرة" en="Warranty Terms & Conditions Summary" />
      <div className="grid grid-cols-2 gap-4 py-1 text-xs text-slate-600">
        <p dir="rtl" className="text-right">
          • الضمان يشمل الأعمال المنفذة فقط ولا يشمل الأعطال الجديدة أو سوء الاستخدام أو العوامل الخارجية.
        </p>
        <p>• Warranty applies only to the performed work and does not cover new faults, misuse, or external factors.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 py-1 text-xs text-slate-600">
        <p dir="rtl" className="text-right">
          • يجب التواصل مع خدمات آسطا قبل أي إصلاح أو تدخل من طرف آخر، وإلا يعتبر الضمان ملغيًا.
        </p>
        <p>• Customers must contact Osta Services before any repair or intervention by another party, otherwise the warranty will be void.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 py-1 text-xs text-slate-600">
        <p dir="rtl" className="text-right">
          • لا يشمل الضمان قطع الغيار أو الأعطال غير المرتبطة مباشرة بالخدمة المقدمة.
        </p>
        <p>• Warranty does not cover spare parts or issues unrelated to the provided service.</p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs">
        <div dir="rtl" className="text-right">
          <div className="text-slate-500">للاطلاع على الشروط والأحكام الكاملة:</div>
          <div className="text-blue-600 mt-0.5">{TERMS_URL}</div>
        </div>
        <div>
          <div className="text-slate-500">For full warranty terms and conditions, please visit:</div>
          <div className="text-blue-600 mt-0.5">{TERMS_URL}</div>
        </div>
      </div>
    </div>
  );
}
