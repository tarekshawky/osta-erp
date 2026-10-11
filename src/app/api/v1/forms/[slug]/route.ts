import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, corsPreflight } from "@/lib/apiResponse";
import type { FormField } from "@/lib/forms/forms";

export function OPTIONS() {
  return corsPreflight();
}

// Public definition the website uses to draw the form. Recipients and anything internal stay private.
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const form = await prisma.cmsForm.findFirst({ where: { slug, active: true } });
  if (!form) return apiError("not_found", "Form not found.", 404);
  return apiSuccess({
    slug: form.slug, nameEn: form.nameEn, nameAr: form.nameAr, fields: form.fields as unknown as FormField[],
    submitLabelEn: form.submitLabelEn, submitLabelAr: form.submitLabelAr, successEn: form.successEn, successAr: form.successAr,
  });
}
