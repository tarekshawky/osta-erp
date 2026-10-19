"use client";

import { PageTreeManager, type TreeActions, type TreePage } from "@/components/cms/PageTreeManager";
import { createPreviewUrl, publishPage, unpublishPage } from "@/app/admin/website/actions";
import { savePageLayout, setPageInMenu } from "@/app/admin/website/structure-actions";

// Connects the tree screen to the real server actions (the screen itself takes them as props so it can be tested alone).
const actions: TreeActions = {
  saveLayout: savePageLayout,
  setInMenu: setPageInMenu,
  publish: (id) => publishPage(id, null),
  unpublish: unpublishPage,
  preview: createPreviewUrl,
};

export function StructureScreen({ pages }: { pages: TreePage[] }) {
  return <PageTreeManager pages={pages} actions={actions} />;
}
