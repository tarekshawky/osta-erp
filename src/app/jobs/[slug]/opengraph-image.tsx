import { ImageResponse } from "next/og";
import { EMIRATE_LABEL, JOB_TYPE_LABEL } from "@/lib/jobs/constants";
import { jobBySlug } from "@/lib/jobs/publicQueries";

export const alt = "Osta Services job";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

// The picture shown when the job link is shared on WhatsApp. Satori (the image renderer) cannot join Arabic letters, so the
// card uses the English title, the trade and the emirate; Arabic-only jobs show their trade name in English.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await jobBySlug(slug);
  const visible = job && job.status !== "DRAFT";
  const title = visible ? job.titleEn?.trim() || job.category.nameEn : "Jobs at Osta Services";
  const line = visible ? `${EMIRATE_LABEL[job.emirate].en}${job.area ? ` – ${job.area}` : ""}` : "Apply with photos of your work";
  const type = visible ? JOB_TYPE_LABEL[job.type].en : "Hiring";
  const status = !visible ? null : job.status === "COMPLETED" ? "Completed" : job.status === "CANCELLED" ? "Cancelled" : null;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "linear-gradient(135deg,#0b1d4d 0%,#1d4ed8 100%)", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 40, fontWeight: 800 }}>
          <span>OS</span><span style={{ color: "#93c5fd" }}>TA</span><span style={{ fontSize: 26, fontWeight: 600, opacity: 0.8, marginLeft: 8 }}>Osta Services</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <span style={{ background: "rgba(255,255,255,0.18)", padding: "8px 20px", borderRadius: 999, fontSize: 28 }}>{type}</span>
            {status && <span style={{ background: "#f59e0b", padding: "8px 20px", borderRadius: 999, fontSize: 28, color: "#111" }}>{status}</span>}
          </div>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, maxWidth: 1000 }}>{title.slice(0, 70)}</div>
          <div style={{ fontSize: 38, opacity: 0.9 }}>{line}</div>
        </div>
        <div style={{ fontSize: 28, opacity: 0.85 }}>Apply and upload your work photos</div>
      </div>
    ),
    size,
  );
}
