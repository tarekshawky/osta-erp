"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getGlobalBlock } from "@/app/admin/website/global-blocks-actions";
import { BLOCK_REGISTRY, type BlockType } from "@/lib/cms/blocks";

type Content = { id: string; name: string; type: string; props: Record<string, unknown> };

// What a page shows for a block that is linked to a Global Block: which one, how to edit it, and how to cut the link
// (turning it into this page's own independent copy).
export function GlobalBlockRef({ globalId, onDetach }: { globalId: string; onDetach: (content: { type: BlockType; props: Record<string, unknown> }) => void }) {
  const [content, setContent] = useState<Content | null | undefined>(undefined);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    getGlobalBlock(globalId).then((c) => live && setContent(c)).catch(() => live && (setContent(null), setError("Could not load the global block.")));
    return () => {
      live = false;
    };
  }, [globalId]);

  if (content === undefined) return <p className="text-xs text-slate-400">Loading…</p>;
  if (content === null) return <p className="text-sm text-red-600">{error || "This global block no longer exists, so nothing is shown on the website for this block. Delete this block."}</p>;
  const label = BLOCK_REGISTRY[content.type as BlockType]?.label ?? content.type;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-sm">
      <p className="text-slate-700">
        This block is linked to the global block <strong>{content.name}</strong> ({label}). Changing the global block changes every page that uses it.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href={`/admin/website/global-blocks/${content.id}`} target="_blank" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white">
          Edit the global block
        </Link>
        <button
          type="button"
          onClick={() => {
            if (confirm("Make this an independent copy? It keeps today's content but stops following the global block.")) onDetach({ type: content.type as BlockType, props: content.props });
          }}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
        >
          Make independent copy
        </button>
      </div>
    </div>
  );
}
