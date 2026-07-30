import { LogoImage } from "@/components/LogoImage";
import { formatDateSlash } from "@/lib/format";
import { COMPANY_INFO } from "@/lib/invoiceData";
import { CONDITION_STYLES } from "@/lib/workReportData";
import {
  inter,
  NAVY,
  BLUE,
  DocIcon,
  CalendarIcon,
  PersonIcon,
  GlobeIcon,
  PhoneIcon,
  MailIcon,
  PinIcon,
  InfoRow,
  InfoCard,
} from "@/components/invoice/InvoicePreviewCard";

export type WorkReportPreviewPhoto = {
  id: string;
  dataUrl: string;
};

export type WorkReportPreviewItem = {
  id: string;
  deviceType: string;
  tonnage: string | null;
  gasType: string | null;
  brand: string | null;
  condition: string;
  description: string | null;
  photos: WorkReportPreviewPhoto[];
};

export type WorkReportPreviewData = {
  id: string;
  date: Date;
  customerName: string | null;
  customerPhone: string | null;
  emirate: string | null;
  buildingName: string | null;
  flatNo: string | null;
  teamName?: string | null;
  createdByName: string;
  items: WorkReportPreviewItem[];
};

export function WorkReportPreviewCard({
  report,
  innerRef,
}: {
  report: WorkReportPreviewData;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  const reportNo = `WR-${report.id.slice(-6).toUpperCase()}`;
  const customerLine = [report.buildingName, report.flatNo, report.emirate].filter(Boolean).join(", ");

  return (
    <div
      ref={innerRef}
      className={`${inter.className} relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3 sm:p-8`}
    >
      <svg width="70" height="70" viewBox="0 0 70 70" className="absolute -left-px -top-px">
        <path d="M0 0H70L0 70V0Z" fill={BLUE} />
        <path d="M0 0H45L0 45V0Z" fill={NAVY} />
      </svg>

      {/* Header */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0 flex flex-col items-center text-center sm:items-start sm:text-left">
          <LogoImage className="h-14 sm:h-24 lg:h-28 w-auto" />
          <div className="text-xs font-bold tracking-[0.35em] mt-1.5" style={{ color: NAVY }}>
            SERVICES
          </div>
          <div className="mt-3 sm:mt-6 text-base font-bold text-gray-900">{COMPANY_INFO.name}</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
            <DocIcon />
            <span>
              License No: {COMPANY_INFO.license} &nbsp;|&nbsp; TRN: {COMPANY_INFO.trn}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <GlobeIcon />
            <span>{COMPANY_INFO.website}</span>
          </div>
        </div>

        <div className="text-right shrink-0 mx-auto sm:mx-0">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-wide" style={{ color: NAVY }}>
            WORK REPORT
          </div>
          <div className="h-1 w-16 rounded-full mt-1.5 ml-auto" style={{ backgroundColor: BLUE }} />
          <div className="mt-4 flex flex-col gap-2.5 rounded-xl border border-gray-200 p-3">
            <InfoRow icon={<DocIcon />} label="REPORT NO." value={reportNo} />
            <InfoRow icon={<CalendarIcon />} label="REPORT DATE" value={formatDateSlash(report.date)} />
            <InfoRow icon={<PersonIcon />} label="TECHNICIAN" value={report.createdByName} />
          </div>
        </div>
      </div>

      <div className="mt-6 border-t-2" style={{ borderColor: NAVY }} />

      {/* Customer */}
      <div className="mt-6">
        <InfoCard title="CUSTOMER" icon={<PersonIcon />}>
          <div className="font-bold text-gray-900">{report.customerName || "No customer info"}</div>
          {report.customerPhone && <div className="text-sm text-gray-500 mt-0.5">{report.customerPhone}</div>}
          {customerLine && <div className="text-sm text-gray-500">{customerLine}</div>}
        </InfoCard>
      </div>

      {/* Device items */}
      <div className="mt-6 flex flex-col gap-3">
        {report.items.map((item, i) => (
          <div key={item.id} className="rounded-xl border border-gray-200 overflow-hidden">
            <div
              className="px-3 py-2.5 text-white flex items-center justify-between gap-2 flex-wrap"
              style={{ backgroundColor: NAVY }}
            >
              <span className="text-sm font-semibold">
                #{i + 1} {item.deviceType}
                {item.brand ? ` · ${item.brand}` : ""}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  CONDITION_STYLES[item.condition] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {item.condition}
              </span>
            </div>
            <div className="p-3">
              <div className="text-xs text-gray-500">
                {[item.tonnage, item.gasType].filter(Boolean).join(" · ") || "—"}
              </div>
              {item.description && <p className="text-sm text-gray-700 mt-1.5">{item.description}</p>}
              {item.photos.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {item.photos.map((photo) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={photo.id}
                      src={photo.dataUrl}
                      alt=""
                      className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {report.items.length === 0 && (
          <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-400 text-center">
            No devices recorded.
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="mt-6 -mx-3 sm:-mx-8 -mb-3 sm:-mb-8 px-3 sm:px-8 py-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-white text-xs"
        style={{ backgroundColor: NAVY }}
      >
        <span className="flex items-center gap-1.5">
          <PhoneIcon /> {COMPANY_INFO.phone}
        </span>
        <span className="flex items-center gap-1.5">
          <MailIcon /> {COMPANY_INFO.email}
        </span>
        <span className="flex items-center gap-1.5">
          <GlobeIcon /> {COMPANY_INFO.website}
        </span>
        <span className="flex items-center gap-1.5">
          <PinIcon /> {COMPANY_INFO.address}
        </span>
      </div>
    </div>
  );
}
