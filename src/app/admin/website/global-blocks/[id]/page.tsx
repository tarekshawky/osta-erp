import { notFound } from "next/navigation";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { GlobalBlockEditor } from "@/components/cms/GlobalBlockEditor";
import { getGlobalBlock, listGlobalBlocks } from "../../global-blocks-actions";

export default async function GlobalBlockPage({ params }: { params: Promise<{ id: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;
  const block = await getGlobalBlock(id).catch(() => null);
  if (!block) notFound();
  const usedOn = (await listGlobalBlocks().catch(() => [])).find((g) => g.id === id)?.usedOn ?? [];
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Global Block" />
      <div className="px-6 py-6">
        <GlobalBlockEditor id={block.id} name={block.name} type={block.type} props={block.props} usedOn={usedOn} />
      </div>
    </div>
  );
}
