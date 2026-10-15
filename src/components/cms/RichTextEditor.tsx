"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { inputClassName } from "@/components/FormField";
import { LinkTargetsContext } from "@/components/cms/LinkInserter";
import { MediaLibrary } from "@/components/media/MediaLibrary";
import { isEmptyRich, isRichHtml, plainToRichHtml, sanitizeRichHtml } from "@/lib/cms/richText";

const SIZES = [
  { label: "Size", value: "" },
  { label: "Small (14)", value: "14px" },
  { label: "Large (20)", value: "20px" },
  { label: "X-Large (24)", value: "24px" },
  { label: "XX-Large (32)", value: "32px" },
  { label: "Huge (44)", value: "44px" },
];
const LINE_HEIGHTS = [
  { label: "Line", value: "" },
  { label: "Tight", value: "1.2" },
  { label: "Normal", value: "1.5" },
  { label: "Relaxed", value: "1.8" },
  { label: "Loose", value: "2.2" },
];
// Colours that work on both the light and the dark site theme (no near-black or white).
const SWATCHES = ["#64748b", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#db2777"];
const HIGHLIGHTS = ["#fef08a", "#bbf7d0", "#bae6fd", "#fbcfe8", "#fed7aa", "#e2e8f0"];

const toEditorHtml = (v: string) => (isRichHtml(v) ? v : v ? plainToRichHtml(v) : "");

function Btn({ on, active, label, children, disabled }: { on: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm transition-colors disabled:opacity-40 ${active ? "bg-blue-100 text-blue-700" : "text-slate-700 hover:bg-slate-100"}`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-0.5 h-5 w-px bg-slate-200" aria-hidden />;

function Palette({ label, colors, onPick, onClear, children }: { label: string; colors: string[]; onPick: (c: string) => void; onClear: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [toEnd, setToEnd] = useState(false);
  return (
    <div className="relative">
      <button type="button" title={label} aria-label={label} aria-expanded={open} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { setToEnd(e.currentTarget.getBoundingClientRect().left + 190 > window.innerWidth - 8); setOpen((o) => !o); }} className="flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm text-slate-700 hover:bg-slate-100">
        {children}
      </button>
      {open && (
        <div className={`absolute ${toEnd ? "end-0" : "start-0"} top-9 z-30 flex w-44 flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-lg`} onMouseDown={(e) => e.preventDefault()}>
          {colors.map((c) => (
            <button key={c} type="button" aria-label={c} onClick={() => { onPick(c); setOpen(false); }} className="h-6 w-6 rounded border border-slate-300" style={{ background: c }} />
          ))}
          <label className="flex h-6 cursor-pointer items-center gap-1 text-[11px] text-slate-600">
            <input type="color" className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0" onChange={(e) => onPick(e.target.value)} aria-label="Custom colour" />
            Custom
          </label>
          <button type="button" onClick={() => { onClear(); setOpen(false); }} className="w-full rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50">
            Remove colour
          </button>
        </div>
      )}
    </div>
  );
}

function LinkPanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const targets = useContext(LinkTargetsContext);
  const groups = [...new Set(targets.map((t) => t.group))];
  const current = editor.getAttributes("link") as { href?: string; target?: string | null };
  const empty = editor.state.selection.empty && !editor.isActive("link");
  const [url, setUrl] = useState(current.href ?? "");
  const [newTab, setNewTab] = useState(current.target === "_blank");
  const [words, setWords] = useState("");
  const [error, setError] = useState<string | null>(null);

  function apply() {
    const href = url.trim();
    if (!/^(\/(?!\/)|https:\/\/|tel:|mailto:)/.test(href) || /\s/.test(href)) return setError("Use a site path like /pricing, an https:// address, tel: or mailto:.");
    const attrs = { href, target: newTab ? "_blank" : null, rel: newTab ? "noopener noreferrer" : null };
    if (empty) {
      if (!words.trim()) return setError("Type the words to show, or select some text first.");
      editor.chain().focus().insertContent({ type: "text", text: words.trim(), marks: [{ type: "link", attrs }] }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink(attrs).run();
    }
    onClose();
  }

  return (
    <div className="flex flex-col gap-2 border-t border-blue-200 bg-blue-50 p-3 text-xs text-slate-700">
      {empty && (
        <label className="flex flex-col gap-1">
          <span className="font-medium">Words to show</span>
          <input className={inputClassName} value={words} onChange={(e) => setWords(e.target.value)} placeholder="e.g. our pricing page" />
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className="font-medium">Choose a page</span>
        <select className={inputClassName} value="" onChange={(e) => e.target.value && setUrl(e.target.value)}>
          <option value="">— pick a page of your site —</option>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {targets.filter((t) => t.group === g).map((t) => (
                <option key={t.url} value={t.url}>{t.label} ({t.url})</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium">…or type an address</span>
        <input className={inputClassName} dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/pricing, https://…, tel:+971…, mailto:…" />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} /> Open in a new tab
      </label>
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={apply} className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white">{current.href ? "Update link" : "Add link"}</button>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">Cancel</button>
      </div>
    </div>
  );
}

function ImagePanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [alt, setAlt] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Insert an image">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Insert an image</h3>
          <button type="button" onClick={onClose} className="text-sm text-slate-500">Close</button>
        </div>
        <label className="mb-3 flex flex-col gap-1 text-xs font-medium text-slate-600">
          Image description (alt text — helps search engines and screen readers)
          <input className={inputClassName} value={alt} onChange={(e) => setAlt(e.target.value)} />
        </label>
        <MediaLibrary onPick={(src) => { editor.chain().focus().setImage({ src, alt }).run(); onClose(); }} />
      </div>
    </div>
  );
}

type Props = { value: string; onChange: (value: string) => void; dir?: "ltr" | "rtl"; placeholder?: string };

// The visual editor for block text: headings, size, colours, lists, alignment, links, images and an HTML source view.
// Older plain-text values open converted to paragraphs and links, and stay untouched until edited.
export function RichTextEditor({ value, onChange, dir = "ltr", placeholder }: Props) {
  const last = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        code: false,
        codeBlock: false,
        trailingNode: false,
        link: { openOnClick: false, autolink: false, HTMLAttributes: { rel: null, target: null } },
      }),
      TextStyleKit.configure({ fontFamily: false, backgroundColor: false }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["start", "center", "end", "justify"] }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Write here…" }),
    ],
    content: toEditorHtml(value),
    editorProps: { attributes: { dir, class: "rich-editor-surface" } },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const next = isEmptyRich(html) ? "" : html;
      last.current = next;
      onChange(next);
    },
  });

  // Follow outside changes (restoring a version, switching blocks) without fighting the cursor while typing.
  useEffect(() => {
    if (editor && value !== last.current) {
      last.current = value;
      editor.commands.setContent(toEditorHtml(value), { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return <div className="min-h-32 rounded-lg border border-slate-200 bg-slate-50" aria-busy />;
  return <Shell editor={editor} dir={dir} />;
}

// Split from the component above so the toolbar state hook only ever sees a real editor.
function Shell({ editor, dir }: { editor: Editor; dir: "ltr" | "rtl" }) {
  const [panel, setPanel] = useState<null | "link" | "image">(null);
  const [source, setSource] = useState<string | null>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      return ed ? {
            bold: ed.isActive("bold"), italic: ed.isActive("italic"), underline: ed.isActive("underline"), strike: ed.isActive("strike"),
            bullet: ed.isActive("bulletList"), ordered: ed.isActive("orderedList"), quote: ed.isActive("blockquote"), link: ed.isActive("link"),
            h2: ed.isActive("heading", { level: 2 }), h3: ed.isActive("heading", { level: 3 }), h4: ed.isActive("heading", { level: 4 }),
            alignCenter: ed.isActive({ textAlign: "center" }), alignEnd: ed.isActive({ textAlign: "end" }), alignJustify: ed.isActive({ textAlign: "justify" }),
            size: (ed.getAttributes("textStyle").fontSize as string | undefined) ?? "",
            lineHeight: (ed.getAttributes("textStyle").lineHeight as string | undefined) ?? "",
            canUndo: ed.can().undo(), canRedo: ed.can().redo(),
          } : null;
    },
  });


  if (!state) return null;
  const block = state.h2 ? "h2" : state.h3 ? "h3" : state.h4 ? "h4" : "p";
  const run = () => editor.chain().focus();
  const alignStart = !state.alignCenter && !state.alignEnd && !state.alignJustify;

  function setBlock(v: string) {
    if (v === "p") run().setParagraph().run();
    else run().setHeading({ level: Number(v.slice(1)) as 2 | 3 | 4 }).run();
  }
  function applySource() {
    if (source === null) return;
    const clean = sanitizeRichHtml(source);
    editor.commands.setContent(clean, { emitUpdate: true });
    setSource(null);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white focus-within:border-blue-400">
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-slate-200 bg-slate-50 p-1.5" role="toolbar" aria-label="Text formatting">
        <Btn label="Undo" on={() => run().undo().run()} disabled={!state.canUndo}>↶</Btn>
        <Btn label="Redo" on={() => run().redo().run()} disabled={!state.canRedo}>↷</Btn>
        <Sep />
        <select aria-label="Paragraph style" value={block} onChange={(e) => setBlock(e.target.value)} className="h-8 rounded-md border border-slate-200 bg-white px-1.5 text-xs">
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
        </select>
        <select aria-label="Font size" value={SIZES.some((s) => s.value === state.size) ? state.size : ""} onChange={(e) => (e.target.value ? run().setFontSize(e.target.value).run() : run().unsetFontSize().run())} className="h-8 rounded-md border border-slate-200 bg-white px-1.5 text-xs">
          {SIZES.map((s) => <option key={s.label} value={s.value}>{s.label}</option>)}
        </select>
        <select aria-label="Line height" value={LINE_HEIGHTS.some((s) => s.value === state.lineHeight) ? state.lineHeight : ""} onChange={(e) => (e.target.value ? run().setLineHeight(e.target.value).run() : run().unsetLineHeight().run())} className="h-8 rounded-md border border-slate-200 bg-white px-1.5 text-xs">
          {LINE_HEIGHTS.map((s) => <option key={s.label} value={s.value}>{s.label}</option>)}
        </select>
        <Sep />
        <Btn label="Bold" active={state.bold} on={() => run().toggleBold().run()}><b>B</b></Btn>
        <Btn label="Italic" active={state.italic} on={() => run().toggleItalic().run()}><i>I</i></Btn>
        <Btn label="Underline" active={state.underline} on={() => run().toggleUnderline().run()}><u>U</u></Btn>
        <Btn label="Strikethrough" active={state.strike} on={() => run().toggleStrike().run()}><s>S</s></Btn>
        <Sep />
        <Palette label="Text colour" colors={SWATCHES} onPick={(c) => run().setColor(c).run()} onClear={() => run().unsetColor().run()}>
          <span className="flex flex-col items-center leading-none"><span className="font-semibold">A</span><span className="mt-0.5 h-1 w-4 rounded bg-red-500" /></span>
        </Palette>
        <Palette label="Highlight" colors={HIGHLIGHTS} onPick={(c) => run().setHighlight({ color: c }).run()} onClear={() => run().unsetHighlight().run()}>
          <span className="rounded bg-yellow-200 px-1 font-semibold">A</span>
        </Palette>
        <Sep />
        <Btn label="Align to start" active={alignStart} on={() => run().unsetTextAlign().run()}>{dir === "rtl" ? "⇥" : "⇤"}</Btn>
        <Btn label="Centre" active={state.alignCenter} on={() => run().setTextAlign("center").run()}>↔</Btn>
        <Btn label="Align to end" active={state.alignEnd} on={() => run().setTextAlign("end").run()}>{dir === "rtl" ? "⇤" : "⇥"}</Btn>
        <Btn label="Justify" active={state.alignJustify} on={() => run().setTextAlign("justify").run()}>☰</Btn>
        <Sep />
        <Btn label="Bulleted list" active={state.bullet} on={() => run().toggleBulletList().run()}>•≡</Btn>
        <Btn label="Numbered list" active={state.ordered} on={() => run().toggleOrderedList().run()}>1.≡</Btn>
        <Btn label="Quote" active={state.quote} on={() => run().toggleBlockquote().run()}>❝</Btn>
        <Sep />
        <Btn label="Add or edit link" active={state.link} on={() => setPanel(panel === "link" ? null : "link")}>🔗</Btn>
        <Btn label="Remove link" on={() => run().extendMarkRange("link").unsetLink().run()} disabled={!state.link}>Unlink</Btn>
        <Btn label="Insert image" on={() => setPanel("image")}>🖼</Btn>
        <Btn label="Divider line" on={() => run().setHorizontalRule().run()}>―</Btn>
        <Sep />
        <Btn label="Clear formatting" on={() => run().unsetAllMarks().clearNodes().unsetTextAlign().run()}>Tx</Btn>
        <Btn label="Edit HTML source" active={source !== null} on={() => setSource(source === null ? editor.getHTML() : null)}>{"</>"}</Btn>
      </div>

      {panel === "link" && <LinkPanel key={String(state.link)} editor={editor} onClose={() => setPanel(null)} />}
      {panel === "image" && <ImagePanel editor={editor} onClose={() => setPanel(null)} />}

      {source !== null ? (
        <div className="flex flex-col gap-2 p-2">
          <textarea dir="ltr" className={`${inputClassName} min-h-48 font-mono text-xs`} value={source} onChange={(e) => setSource(e.target.value)} spellCheck={false} />
          <p className="text-[11px] text-slate-500">Only safe formatting is kept: scripts, unknown tags and unsafe links are removed when you apply.</p>
          <div className="flex gap-2">
            <button type="button" onClick={applySource} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white">Apply HTML</button>
            <button type="button" onClick={() => setSource(null)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs">Cancel</button>
          </div>
        </div>
      ) : (
        <EditorContent editor={editor} className="rich-editor" />
      )}
    </div>
  );
}
