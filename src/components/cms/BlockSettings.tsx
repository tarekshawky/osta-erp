"use client";

import { useState } from "react";
import { FieldEditor } from "@/components/cms/BlockForm";
import { BlockCodeFields } from "@/components/cms/BlockCodeFields";
import { ShowcaseEditor } from "@/components/cms/ShowcaseEditor";
import { BLOCK_REGISTRY, STYLE_FIELDS, STYLE_TABS, type Block, type BlockType, type FieldDef, type StyleTab } from "@/lib/cms/blocks";

type Props = Record<string, unknown>;
type TabId = "content" | StyleTab;
const TAB_LABEL: Record<TabId, string> = { content: "Content", design: "Design", layout: "Layout", advanced: "Advanced", responsive: "Responsive" };

// The settings of one block, in tabs: Content (the block's own fields) and, for every block with a section design, Design, Layout,
// Advanced and Responsive. The tabs only regroup the same `style` fields, so nothing already saved changes.
export function BlockSettings({
  type, props, onChange, visibility, onVisibilityChange, customContent, canEditCode = false,
}: {
  type: BlockType; props: Props; onChange: (p: Props) => void;
  // Per-device visibility belongs to a block placed on a page; a global block's content has none.
  visibility?: Block["visibility"]; onVisibilityChange?: (v: Block["visibility"]) => void;
  // Replaces the Content tab (a block linked to a global block shows its link instead of fields).
  customContent?: React.ReactNode;
  // The owner (integrations.manage) may write custom CSS / JavaScript for the block.
  canEditCode?: boolean;
}) {
  const [tab, setTab] = useState<TabId>("content");
  const reg = BLOCK_REGISTRY[type];
  const hasStyle = reg.fields.some((f) => f.key === "style");
  const tabs: TabId[] = hasStyle ? ["content", "design", "layout", "advanced", "responsive"] : visibility ? ["content", "responsive"] : ["content"];
  const style = (props.style && typeof props.style === "object" ? props.style : {}) as Props;
  const contentFields = reg.fields.filter((f) => f.key !== "style");
  const styleFieldsFor = (t: StyleTab): FieldDef[] => STYLE_FIELDS.filter((f) => (STYLE_TABS[t] as readonly string[]).includes(f.key));

  return (
    <div className="flex flex-col gap-4">
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Block settings">
          {tabs.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${tab === t ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
      )}

      {tab === "content" &&
        (customContent ? (
          customContent
        ) : type === "showcase" ? (
          <ShowcaseEditor value={props} onChange={onChange} />
        ) : (
          <FieldEditor fields={contentFields} value={props} onChange={onChange} />
        ))}

      {tab !== "content" && tab !== "responsive" && <FieldEditor fields={styleFieldsFor(tab)} value={style} onChange={(s) => onChange({ ...props, style: s })} />}
      {tab === "advanced" && <BlockCodeFields style={style} canEdit={canEditCode} onChange={(s) => onChange({ ...props, style: s })} />}

      {tab === "responsive" && (
        <div className="flex flex-col gap-5">
          {visibility && onVisibilityChange && (
            <fieldset className="rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-xs font-semibold text-slate-500">Show this block on</legend>
              <div className="flex flex-wrap gap-5 text-sm text-slate-700">
                {([["desktop", "Desktop"], ["tablet", "Tablet"], ["mobile", "Phone"]] as const).map(([k, label]) => {
                  // Tablets follow the desktop setting until they are set explicitly (blocks saved before tablets existed).
                  const checked = k === "tablet" ? (visibility.tablet ?? visibility.desktop) : visibility[k];
                  return (
                    <label key={k} className="flex items-center gap-2">
                      <input type="checkbox" checked={checked} onChange={(e) => onVisibilityChange({ ...visibility, [k]: e.target.checked })} />
                      {label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
          {hasStyle && (
            <>
              <FieldEditor fields={styleFieldsFor("responsive")} value={style} onChange={(s) => onChange({ ...props, style: s })} />
              <p className="text-xs text-slate-400">Heading and text size on phones change only those parts. “Content size” scales the whole block (text, spacing and pictures together) on that device. Tablets and phones follow desktop until you set them.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
