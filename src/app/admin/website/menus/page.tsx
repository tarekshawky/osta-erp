import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { MenuEditor } from "@/components/cms/MenuEditor";
import type { MenuItemInput } from "@/lib/site/siteRules";

type Row = Awaited<ReturnType<typeof load>>[number];
const load = () => prisma.menuItem.findMany({ orderBy: { sortOrder: "asc" } });

function tree(rows: Row[], menu: string): MenuItemInput[] {
  const shape = (m: Row): Omit<MenuItemInput, "children"> => ({
    labelEn: m.labelEn, labelAr: m.labelAr, url: m.url, visible: m.visible, showDesktop: m.showDesktop, showMobile: m.showMobile, newTab: m.newTab,
  });
  return rows.filter((m) => m.menu === menu && m.parentId === null).map((t) => ({ ...shape(t), children: rows.filter((c) => c.parentId === t.id).map((c) => ({ ...shape(c), children: [] })) }));
}

export default async function MenusPage() {
  await requireEmployee("ADMIN");
  const rows = await load();
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Menus" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <p className="mb-5 max-w-2xl text-sm text-slate-500">Drag items to reorder. Sub-items appear as a dropdown. The log-in / dashboard button and language switch are part of the site and always shown.</p>
        <div className="flex max-w-4xl flex-col gap-6">
          <MenuEditor menu="header" title="Header menu" initial={tree(rows, "header")} />
          <MenuEditor menu="footer" title="Footer quick links" initial={tree(rows, "footer")} />
        </div>
      </div>
    </div>
  );
}
