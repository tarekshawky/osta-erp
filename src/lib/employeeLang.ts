import { cookies } from "next/headers";

export type EmployeeLang = "ar" | "en";

export const EMPLOYEE_LANG_COOKIE = "employee_lang";

export async function getEmployeeLang(): Promise<EmployeeLang> {
  const store = await cookies();
  return store.get(EMPLOYEE_LANG_COOKIE)?.value === "en" ? "en" : "ar";
}

export function pickLang<T extends { ar: unknown; en: unknown }>(lang: EmployeeLang, dict: T): T[EmployeeLang] {
  return dict[lang];
}
