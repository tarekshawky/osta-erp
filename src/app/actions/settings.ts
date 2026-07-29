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
