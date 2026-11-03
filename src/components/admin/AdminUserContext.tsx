"use client";

import { createContext, useContext } from "react";

// Who is signed in to the admin (for the header and the sidebar). Display only: every page is still protected on the server.
export type AdminUser = { name: string; isSuperAdmin: boolean; adminSections: string[] };
const Ctx = createContext<AdminUser>({ name: "", isSuperAdmin: false, adminSections: [] });
export const AdminUserProvider = Ctx.Provider;
export const useAdminUser = () => useContext(Ctx);
