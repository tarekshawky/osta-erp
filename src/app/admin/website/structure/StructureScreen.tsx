"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageTreeManager, type TreeActions, type TreePage } from "@/components/cms/PageTreeManager";
import { createPreviewUrl, deletePage, duplicatePage, publishPage, unpublishPage } from "@/app/admin/website/actions";
import { savePageLayout, setPageInMenu, setPageParent } from "@/app/admin/website/structure-actions";

// Connects the tree screen to the real server actions (the screen itself takes them as props so it can be tested alone).
export function StructureScreen({ pages }: { pages: TreePage[] }) {
  const router = useRouter();
  const actions = useMemo<TreeActions>(
    () => ({
      saveLayout: savePageLayout,
      setInMenu: setPageInMenu,
      publish: (id) => publishPage(id, null),
      unpublish: unpublishPage,
      preview: createPreviewUrl,
      duplicate: duplicatePage,
      remove: deletePage,
      setParent: setPageParent,
      refresh: () => router.refresh(),
    }),
    [router],
  );
  // The screen keeps its own copy while you work; it reloads from the server only when pages are added or removed.
  return <PageTreeManager key={pages.map((p) => p.id).join(",")} pages={pages} actions={actions} />;
}
