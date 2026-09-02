"use server";

import { cookies } from "next/headers";
import { EMPLOYEE_LANG_COOKIE } from "@/lib/employeeLang";

export async function setEmployeeLang(lang: "ar" | "en") {
  const store = await cookies();
  store.set(EMPLOYEE_LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}
