import { it, expect } from "vitest";
import { readFileSync } from "fs";
import { prisma } from "@/lib/prisma";
import { changeJobStatus, createJob, duplicateJob, parseJobInput, updateJob, listCategories } from "@/lib/jobs/service";
import { addApplicationNote, linkApplicantToJob, listApplications, logContact, setApplicationStatus } from "@/lib/jobs/applications";
import { shareTexts } from "@/lib/jobs/share";

const IMG = process.env.E2E_IMG!;
const BASE = process.env.E2E_BASE ?? "http://localhost:3001";
const out: Record<string, unknown> = {};
const ok = (name: string, cond: boolean, detail?: unknown) => { out[name] = cond ? "PASS" : `FAIL ${JSON.stringify(detail)}`; };
const file = (n: string, type = "image/jpeg") => new File([readFileSync(`${IMG}/${n}`)], n, { type });

async function upload(slug: string, n: string, type?: string) {
  const f = new FormData(); f.append("slug", slug); f.append("file", file(n, type));
  const r = await fetch(`${BASE}/api/jobs/uploads`, { method: "POST", body: f });
  return { status: r.status, body: (await r.json()) as { data?: { token: string }; error?: { code: string } } };
}
async function apply(slug: string, over: Record<string, unknown>) {
  const r = await fetch(`${BASE}/api/jobs/apply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, fullName: "ZZ Tester One", phone: "050 000 0001", whatsappSameAsPhone: true, preferredLang: "ar", emirate: "AJMAN", skills: ["painting"], consent: true, idempotencyKey: `key-${Math.random().toString(36).slice(2)}-xx`, elapsedMs: 9000, ...over }) });
  return { status: r.status, body: (await r.json()) as { data?: { code: string }; error?: { code: string; message: string; applicationCode?: string } } };
}
const page = async (path: string, headers: Record<string, string> = {}) => { const r = await fetch(BASE + path, { headers, redirect: "manual" }); return { status: r.status, html: await r.text(), headers: r.headers }; };

// Integration test against a running server and the real database (it creates throwaway "ZZ TEST" jobs and removes them).
// Skipped unless JOBS_E2E=1, with E2E_IMG (a folder of test images) and the server address in E2E_BASE.
it.skipIf(process.env.JOBS_E2E !== "1")("jobs module end to end", { timeout: 540_000 }, async () => {
  const admin = (await prisma.employee.findFirst({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } }, select: { id: true, name: true } }))!;
  const actor = { id: admin.id, name: admin.name };
  const cats = await listCategories();
  const cat = (k: string) => cats.find((c) => c.key === k)!;
  const base = { workersRequired: 2, emirate: "AJMAN", area: "Al Nuaimiya", propertyType: "VILLA", descriptionEn: "<p>ZZ English description</p>", descriptionAr: "<p>وصف عربي</p>", titleEn: "ZZ TEST Painter", titleAr: "ZZ TEST دهان" };
  const mk = async (raw: Record<string, unknown>) => { const p = parseJobInput({ ...base, ...raw }); if (!p.ok) throw new Error(p.error); return createJob(p.data, actor); };

  // 1 permanent job
  const perm = await mk({ type: "PERMANENT", categoryId: cat("electrical").id, titleEn: "ZZ TEST Electrician", titleAr: "ZZ TEST كهربائي", monthlySalaryMin: 2500, monthlySalaryMax: 3500, workingDaysPerWeek: 6, dailyHours: "8 hours" });
  const r1 = await changeJobStatus(perm.id, "PUBLISHED", actor);
  ok("1 permanent job published", r1.ok && /^electrician-ajman-\d+$/.test((r1 as { slug: string }).slug), r1);
  const permSlug = (r1 as { slug: string }).slug;

  // 2 daily painting job with paint finish
  const daily = await mk({ type: "DAILY", categoryId: cat("painting").id, dailyWage: 150, workingDays: 5, startDate: "2026-12-01", applicationDeadline: "2026-11-30T18:00", materialsBy: "OSTA", customFields: { paintFinish: "luxury" } });
  const r2 = await changeJobStatus(daily.id, "PUBLISHED", actor);
  const dailySlug = (r2 as { slug: string }).slug;
  ok("2 daily painting job published", r2.ok && /^painter-ajman-\d+$/.test(dailySlug), r2);
  const dailyFull = await prisma.job.findUnique({ where: { id: daily.id }, include: { category: { include: { fields: true } } } });
  const share = shareTexts(dailyFull!)!;
  ok("12 share text AR has finish+wage+count", share.ar.includes("🎨 نوع الدهان: لوكس") && share.ar.includes("💰 الأجر اليومي: 150 درهم") && share.ar.includes("👷 العدد المطلوب: عاملان") && share.ar.includes(share.url) && !/undefined|null|\n\n\n/.test(share.ar), share.ar);
  ok("12 share text EN", share.en.includes("🎨 Paint Finish: Luxury") && share.en.includes("💰 Daily Wage: AED 150") && /\/join-osta-team\/jobs\/[a-z0-9-]+$/.test(share.url), share.en);
  console.log("---- AR share text ----\n" + share.ar + "\n---- EN share text ----\n" + share.en);

  // 3 painting fields not kept for plumbing
  const plumb = await mk({ type: "DAILY", categoryId: cat("plumbing").id, dailyWage: 120, workingDays: 2, customFields: { paintFinish: "luxury" }, titleEn: "ZZ TEST Plumber", titleAr: "ZZ TEST سباك" });
  const plumbRow = await prisma.job.findUnique({ where: { id: plumb.id } });
  ok("3 painting option never stored for plumbing", JSON.stringify(plumbRow!.customFields) === "{}", plumbRow!.customFields);
  ok("3 category field applies only to painting", cat("plumbing").fields.length === 0 && cat("painting").fields.some((f) => f.key === "paintFinish"));

  // 4 edit and duplicate: slug stable
  const before = (await prisma.job.findUnique({ where: { id: daily.id } }))!.slug;
  const ed = parseJobInput({ ...base, type: "DAILY", categoryId: cat("painting").id, dailyWage: 175, workingDays: 5, titleEn: "ZZ TEST Painter renamed", customFields: { paintFinish: "super-luxury" } });
  if (ed.ok) await updateJob(daily.id, ed.data);
  const after = await prisma.job.findUnique({ where: { id: daily.id } });
  ok("4 slug stable after edit", after!.slug === before && after!.titleEn === "ZZ TEST Painter renamed", { before, after: after!.slug });
  const dup = await duplicateJob(daily.id, actor);
  ok("4 duplicate = new draft, no slug, no applications", dup.status === "DRAFT" && dup.slug === null && (await prisma.jobApplication.count({ where: { jobId: dup.id } })) === 0 && dup.id !== daily.id);

  // 5 missing translation warning
  const oneLang = await mk({ type: "DAILY", categoryId: cat("helper").id, dailyWage: 100, workingDays: 3, titleAr: "", descriptionAr: "", titleEn: "ZZ TEST Helper" });
  const w1 = await changeJobStatus(oneLang.id, "PUBLISHED", actor);
  ok("5 publish with missing Arabic asks for confirmation", !w1.ok && !!(w1 as { needsConfirm?: boolean }).needsConfirm && JSON.stringify((w1 as { missing?: string[] }).missing) === JSON.stringify(["Title (Arabic)", "Description (Arabic)"]), w1);
  const w2 = await changeJobStatus(oneLang.id, "PUBLISHED", actor, { confirmMissingTranslation: true });
  ok("5 publish anyway works", w2.ok, w2);
  const oneSlug = (w2 as { slug: string }).slug;

  // 6 same URL AR and EN, direction
  const ar = await page(`/jobs/${dailySlug}?lang=ar`);
  const en = await page(`/jobs/${dailySlug}?lang=en`);
  ok("6 AR page rtl", ar.status === 200 && /dir="rtl"/.test(ar.html) && /lang="ar"/.test(ar.html), ar.status);
  ok("6 EN page ltr", en.status === 200 && /dir="ltr"/.test(en.html), en.status);
  const canon = (h: string) => /<link rel="canonical" href="([^"]+)"/.exec(h)?.[1];
  ok("6 same canonical URL for both languages", canon(ar.html) === canon(en.html) && canon(ar.html) === share.url, [canon(ar.html), canon(en.html)]);
  const oneAr = await page(`/jobs/${oneSlug}?lang=ar`);
  ok("5b English-only job in Arabic shows the fallback note", /متوفرة بالإنجليزية فقط/.test(oneAr.html), oneAr.status);

  // 8 uploads
  const u1 = await upload(dailySlug, "p1.jpg");
  ok("8 upload one photo", u1.status === 200 && !!u1.body.data?.token, u1);
  const five = []; for (const n of ["p1.jpg", "p2.jpg", "p3.jpg", "p4.jpg", "p5.jpg"]) five.push((await upload(dailySlug, n)).body.data?.token);
  ok("8 upload five photos", five.every(Boolean));
  const exe = await upload(dailySlug, "fake.jpg");
  ok("8 renamed program rejected", exe.status === 400 && exe.body.error?.code === "bad_type", exe);
  const gif = await upload(dailySlug, "anim.gif", "image/gif");
  ok("8 gif rejected", gif.status === 400, gif);
  const bigFile = await upload(dailySlug, "big.jpg");
  ok("8 huge photo rejected (over the size limit)", bigFile.status === 413 && bigFile.body.error?.code === "too_large", bigFile);
  const none = await apply(dailySlug, { photoTokens: [] });
  ok("8 zero photos rejected", none.status === 422, none);
  const six = await apply(dailySlug, { photoTokens: ["x".repeat(30), "y".repeat(30), "a".repeat(30), "b".repeat(30), "c".repeat(30), "d".repeat(30)] });
  ok("8 six photos rejected", six.status === 422, six);

  // 7 application with 1 photo
  const a1 = await apply(dailySlug, { photoTokens: [u1.body.data!.token], fullName: "ZZ Tester One" });
  ok("7 apply with 1 photo", a1.status === 200 && /^APP-\d{6}$/.test(a1.body.data?.code ?? ""), a1);
  // 9 duplicate same phone same job (other format)
  const d1 = await apply(dailySlug, { photoTokens: [five[0]!], phone: "+971500000001" });
  ok("9 same phone twice on same job -> no duplicate", d1.status === 409 && d1.body.error?.code === "duplicate" && d1.body.error.applicationCode === a1.body.data?.code, d1);
  ok("9 applicant not duplicated", (await prisma.jobApplicant.count({ where: { phone: "+971500000001" } })) === 1 && (await prisma.jobApplication.count({ where: { job: { id: daily.id }, applicant: { phone: "+971500000001" } } })) === 1);
  // idempotency
  const idem = "idem-key-123456";
  const i1 = await apply(oneSlug, { photoTokens: [(await upload(oneSlug, "p2.jpg")).body.data!.token], phone: "0500000002", fullName: "ZZ Tester Two", idempotencyKey: idem });
  const i2 = await apply(oneSlug, { photoTokens: ["z".repeat(30)], phone: "0500000002", fullName: "ZZ Tester Two", idempotencyKey: idem });
  ok("7b double submit with the same key returns the same application", i1.status === 200 && i2.status === 200 && i1.body.data?.code === i2.body.data?.code, [i1, i2]);
  // 7 five photos
  const a5 = await apply(permSlug, { photoTokens: [...(await Promise.all(["p1.jpg", "p2.jpg", "p3.jpg", "p4.jpg", "p5.jpg"].map((n) => upload(permSlug, n)))).map((r) => r.body.data!.token)], phone: "0500000001", fullName: "ZZ Tester One" });
  ok("9b same phone to a DIFFERENT job -> new application, same applicant", a5.status === 200 && (await prisma.jobApplicant.count({ where: { phone: "+971500000001" } })) === 1 && (await prisma.jobApplication.count({ where: { applicant: { phone: "+971500000001" } } })) === 2, a5);
  const photoCount = await prisma.jobApplicationPhoto.count({ where: { application: { code: a5.body.data?.code } } });
  ok("7 five photos stored", photoCount === 5, photoCount);
  const exposed = await prisma.jobApplicationPhoto.findFirst({ where: { application: { code: a5.body.data?.code } }, include: { data: true } });
  ok("8 stored photo is private bytes, webp, no EXIF", exposed!.mimeType === "image/webp" && !!exposed!.data && exposed!.storageKey.startsWith("jp_") && !exposed!.storageKey.includes("http"));

  // 10 admin search in any phone format
  for (const q of ["0500000001", "050 000 0001", "+971500000001", "971500000001", "APP-", "ZZ Tester"]) {
    const r = await listApplications({ q }, 1);
    ok(`10 search '${q}' finds the applicant`, r.rows.some((x) => x.applicant.phone === "+971500000001"), r.total);
  }
  const withPhotos = (await listApplications({ q: "0500000001" }, 1)).rows.find((x) => x.code === a1.body.data?.code);
  ok("10 application shows photos", withPhotos?.photos.length === 1);

  // 11 status, note, contact, link
  const appRow = (await prisma.jobApplication.findFirst({ where: { code: a1.body.data?.code } }))!;
  await setApplicationStatus([appRow.id], "SHORTLISTED", actor);
  await addApplicationNote(appRow.id, "ZZ note: good photos", actor);
  await logContact(appRow.id, "call", "reached", "ZZ spoke", actor);
  const afterLog = await prisma.jobApplication.findUnique({ where: { id: appRow.id }, include: { internalNotes: true, contactLogs: true } });
  ok("11 status/note/contact log", afterLog!.status === "CONTACTED" && afterLog!.internalNotes.length === 1 && afterLog!.contactLogs.length === 1, afterLog!.status);
  const linked = await linkApplicantToJob(appRow.id, plumb.id, actor).catch((e) => e);
  await changeJobStatus(plumb.id, "PUBLISHED", actor);
  const linked2 = await linkApplicantToJob(appRow.id, plumb.id, actor);
  ok("11 link to another (open) job: refused while draft, then works with copied photos, same applicant", linked instanceof Error && !!linked2.code && (await prisma.jobApplicant.count({ where: { phone: "+971500000001" } })) === 1 && (await prisma.jobApplicationPhoto.count({ where: { applicationId: linked2.id } })) === 1, linked2);

  // 13 close applications
  const closeR = await changeJobStatus(perm.id, "APPLICATIONS_CLOSED", actor);
  const closedPage = await page(`/jobs/${permSlug}?lang=en`);
  const rej = await apply(permSlug, { photoTokens: [(await upload(permSlug, "p1.jpg")).body.data?.token ?? "t".repeat(30)], phone: "0500000003", fullName: "ZZ Tester Three" });
  ok("13 closed: public message + submit rejected", closeR.ok && /Applications for this opportunity are closed/.test(closedPage.html) && rej.status === 409 && rej.body.error?.code === "closed", rej);
  const reopen = await changeJobStatus(perm.id, "PUBLISHED", actor);
  ok("13b reopen works", reopen.ok);

  // 14 deadline passed
  const late = await mk({ type: "DAILY", categoryId: cat("tiling").id, dailyWage: 130, workingDays: 2, applicationDeadline: "2026-01-01T10:00", titleEn: "ZZ TEST Tiler", titleAr: "ZZ TEST بلاط" });
  const lateR = await changeJobStatus(late.id, "PUBLISHED", actor); const lateSlug = (lateR as { slug: string }).slug;
  const latePage = await page(`/jobs/${lateSlug}?lang=en`); const listing = await page("/jobs?lang=en&q=ZZ+TEST");
  ok("14 deadline passed -> closed message, NOT completed, not listed", /Applications for this opportunity are closed/.test(latePage.html) && !/This Job Has Been Completed/.test(latePage.html) && !listing.html.includes("ZZ TEST Tiler") && (await prisma.job.findUnique({ where: { id: late.id } }))!.status === "PUBLISHED");

  // 15 complete
  const comp = await changeJobStatus(plumb.id, "COMPLETED", actor, { note: "done" });
  const compPage = await page(`/jobs/${(plumb.slug ?? (await prisma.job.findUnique({ where: { id: plumb.id } }))!.slug)}?lang=ar`);
  const compListing = await page("/jobs?lang=ar&q=ZZ+TEST");
  ok("15 completed -> message (AR), link still works, removed from /jobs", comp.ok && /تم الانتهاء من تنفيذ هذا العمل/.test(compPage.html) && compPage.status === 200 && !compListing.html.includes("ZZ TEST سباك"), compPage.status);
  const plumbEn = await page(`/jobs/${(await prisma.job.findUnique({ where: { id: plumb.id } }))!.slug}?lang=en`);
  ok("15b completed message EN", /This Job Has Been Completed/.test(plumbEn.html) && /View Available Jobs/.test(plumbEn.html));
  const hist = await prisma.jobStatusHistory.count({ where: { jobId: plumb.id } });
  ok("4b status history rows written", hist >= 3, hist);

  // draft & unknown -> 404; metadata & seo
  const draftPage = await page(`/jobs/${(dup.slug ?? "nope-ajman-999999")}`);
  ok("5c draft/unknown slug -> 404", draftPage.status === 404, draftPage.status);
  ok("SEO JobPosting only on the open job", /"@type":"JobPosting"/.test(ar.html) && !/"@type":"JobPosting"/.test(compPage.html) && !/"@type":"JobPosting"/.test(latePage.html));
  ok("SEO no invented salary on the open daily job (wage is set)", /"unitText":"DAY"/.test(ar.html));
  const og = await fetch(`${BASE}/jobs/${dailySlug}/opengraph-image`);
  ok("SEO opengraph image", og.status === 200 && (og.headers.get("content-type") ?? "").includes("image/png"), og.status);
  const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
  // The jobs sitemap lives on the website now (its /sitemap.xml lists the open jobs); the dashboard has none.
  ok("dashboard has no sitemap of its own (the website lists the jobs)", !sm.includes("<urlset"), sm.slice(0, 120));

  // 16 access control (logged out)
  const adminPage = await page("/admin/jobs"); const photoUrl = await fetch(`${BASE}/api/admin/jobs/photos/${exposed!.id}`); const exp = await fetch(`${BASE}/api/admin/jobs/applications/export`); const prev = await page(`/jobs/preview/${daily.id}`); const cron = await fetch(`${BASE}/api/cron/jobs-reminders`);
  ok("16 logged out: admin page redirects", adminPage.status >= 300 && adminPage.status < 400, adminPage.status);
  ok("16 logged out: photo API 401", photoUrl.status === 401, photoUrl.status);
  ok("16 logged out: export API 401", exp.status === 401, exp.status);
  ok("16 logged out: preview is a plain 404", prev.status === 404, prev.status);
  ok("16 cron without secret 401", cron.status === 401, cron.status);

  console.log(JSON.stringify(out, null, 1));
  // cleanup
  const ids = (await prisma.job.findMany({ where: { titleEn: { startsWith: "ZZ TEST" } }, select: { id: true } })).map((j) => j.id);
  await prisma.jobApplicationPhoto.deleteMany({ where: { application: { jobId: { in: ids } } } });
  await prisma.jobApplication.deleteMany({ where: { jobId: { in: ids } } });
  await prisma.jobApplicant.deleteMany({ where: { phone: { startsWith: "+9715000000" } } });
  await prisma.jobNotification.deleteMany({ where: { jobId: { in: ids } } });
  await prisma.jobUploadTemp.deleteMany({});
  await prisma.job.deleteMany({ where: { id: { in: ids } } });
  console.log("cleanup done: jobs removed", ids.length);
  console.log("FAILS:", JSON.stringify(Object.entries(out).filter(([, v]) => String(v).startsWith("FAIL"))));
  expect(Object.values(out).filter((v) => String(v).startsWith("FAIL"))).toEqual([]);
});
