"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { SETTING_ID } from "@/lib/settings";

export async function updateLogo(dataUrl: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { ok: false, error: "Not authorized." };
  if (!dataUrl.startsWith("data:image/")) return { ok: false, error: "Invalid image." };

  await prisma.setting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, logoData: dataUrl },
    update: { logoData: dataUrl },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resetLogo(): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { ok: false, error: "Not authorized." };

  await prisma.setting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, logoData: null },
    update: { logoData: null },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCertificateLogo(dataUrl: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { ok: false, error: "Not authorized." };
  if (!dataUrl.startsWith("data:image/")) return { ok: false, error: "Invalid image." };

  await prisma.setting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, certificateLogoData: dataUrl },
    update: { certificateLogoData: dataUrl },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resetCertificateLogo(): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { ok: false, error: "Not authorized." };

  await prisma.setting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, certificateLogoData: null },
    update: { certificateLogoData: null },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type TaxInformationInput = {
  taxRegistrationNumber: string;
  taxRegistrationEffectiveDate: string;
  taxCertificateIssueDate: string;
  firstTaxPeriodStart: string;
  firstTaxPeriodEnd: string;
  firstTaxReturnFilingDueDate: string;
};

// taxRegistrationEffectiveDate (NOT taxCertificateIssueDate) is what every dynamic
// Financial Report period default reads -- kept as its own field so the two dates
// can never be confused (see financialReportsCore.ts's suggestTaxPeriod()).
export async function updateTaxInformation(input: TaxInformationInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { ok: false, error: "Not authorized." };

  const data = {
    taxRegistrationNumber: input.taxRegistrationNumber.trim() || null,
    taxRegistrationEffectiveDate: parseDate(input.taxRegistrationEffectiveDate),
    taxCertificateIssueDate: parseDate(input.taxCertificateIssueDate),
    firstTaxPeriodStart: parseDate(input.firstTaxPeriodStart),
    firstTaxPeriodEnd: parseDate(input.firstTaxPeriodEnd),
    firstTaxReturnFilingDueDate: parseDate(input.firstTaxReturnFilingDueDate),
  };

  await prisma.setting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, ...data },
    update: data,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export type EquitySignatoryInput = {
  shareCapital: string;
  statutoryReserves: string;
  signatoryName: string;
  signatoryDesignation: string;
  shareholderEmployeeId: string;
};

export async function updateEquityAndSignatory(input: EquitySignatoryInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { ok: false, error: "Not authorized." };

  const data = {
    shareCapital: input.shareCapital ? Number(input.shareCapital) : null,
    statutoryReserves: input.statutoryReserves ? Number(input.statutoryReserves) : null,
    signatoryName: input.signatoryName.trim() || null,
    signatoryDesignation: input.signatoryDesignation.trim() || null,
    shareholderEmployeeId: input.shareholderEmployeeId || null,
  };

  await prisma.setting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, ...data },
    update: data,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
