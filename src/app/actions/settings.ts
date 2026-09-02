"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { SETTING_ID } from "@/lib/settings";
import { checkOpeningBalance } from "@/lib/financialReportsBalanceSheet";
import { formatAed } from "@/lib/format";

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

  const shareCapital = input.shareCapital ? Number(input.shareCapital) : null;
  const statutoryReserves = input.statutoryReserves ? Number(input.statutoryReserves) : null;

  const existingSetting = await prisma.setting.findUnique({ where: { id: SETTING_ID } });
  // Only re-validate the balance when Share Capital / Statutory Reserves actually
  // change -- editing an unrelated field (Signatory Name, etc.) shouldn't force the
  // admin to fix a pre-existing opening-balance mismatch they haven't gotten to yet.
  const capitalChanged =
    (shareCapital ?? 0) !== (existingSetting?.shareCapital ?? 0) || (statutoryReserves ?? 0) !== (existingSetting?.statutoryReserves ?? 0);

  if (capitalChanged) {
    const cashPosition = await prisma.cashPosition.findFirst({ orderBy: { updatedAt: "desc" } });
    const check = await checkOpeningBalance({
      openingBalance: cashPosition?.openingBalance ?? 0,
      openingDate: cashPosition?.openingDate ?? new Date(0),
      shareCapital: shareCapital ?? 0,
      statutoryReserves: statutoryReserves ?? 0,
      shareholderEmployeeId: input.shareholderEmployeeId || null,
    });
    if (!check.isBalanced) {
      return {
        ok: false,
        error: `This Share Capital / Statutory Reserves combination leaves the Statement of Financial Position unbalanced by ${formatAed(Math.abs(check.difference))} as at the Cash Position's opening date. Update the Opening Balance in Cash Position to ${formatAed(check.suggestedOpeningBalance)} to balance it.`,
      };
    }
  }

  const data = {
    shareCapital,
    statutoryReserves,
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
