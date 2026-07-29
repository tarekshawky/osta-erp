import { prisma } from "./prisma";
import { DEFAULT_LOGO_SRC, DEFAULT_CERTIFICATE_LOGO_SRC } from "./logo";

const SETTING_ID = "singleton";

export async function getLogoSrc(): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { id: SETTING_ID } });
  return setting?.logoData ?? DEFAULT_LOGO_SRC;
}

export async function getCertificateLogoSrc(): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { id: SETTING_ID } });
  return setting?.certificateLogoData ?? DEFAULT_CERTIFICATE_LOGO_SRC;
}

export { SETTING_ID };
