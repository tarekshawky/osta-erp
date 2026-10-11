"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { inputClassName } from "@/components/FormField";
import { createFolder, deleteFolder, deleteMedia, getAssetUsages, listMedia, renameFolder, updateMedia, type FolderItem, type MediaItem } from "@/app/admin/website/media-actions";
import type { Usage } from "@/lib/media/usage";
import { mediaPublicUrl, mediaThumb, uploadImage } from "./mediaClient";

export function MediaLibrary({ onPick }: { onPick?: (url: string) => void }) {
  const { showToast } = useToast();
  const picking = !!onPick;
  const [assets, setAssets] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState<string>("");
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [usages, setUsages] = useState<Usage[] | null>(null);
  const [draft, setDraft] = useState<MediaItem | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const res = await listMedia({ search, folderId: folder || null, unusedOnly });
    setAssets(res.assets);
    setFolders(res.folders);
    setLoading(false);
  }, [search, folder, unusedOnly]);

  // Debounced so typing in the search box doesn't hit the server on every key.
  useEffect(() => {
    const t = setTimeout(() => void refresh(), 250);
    return () => clearTimeout(t);
  }, [refresh]);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/") || /\.(avif|heic)$/i.test(f.name));
    if (list.length === 0) return showToast("Choose image files (JPG, PNG, WebP, GIF, AVIF).", "error");
    let ok = 0;
    for (const [i, file] of list.entries()) {
      setProgress(`Uploading ${i + 1} of ${list.length}…`);
      try {
        const asset = await uploadImage(file, folder && folder !== "none" ? folder : null);
        ok++;
        if (picking && list.length === 1) onPick!(mediaPublicUrl(asset.id));
      } catch (err) {
        showToast(`${file.name}: ${err instanceof Error ? err.message : "failed"}`, "error");
      }
    }
    setProgress(null);
    if (ok) showToast(`${ok} image${ok === 1 ? "" : "s"} uploaded.`);
    await refresh();
  }

  function open(a: MediaItem) {
    if (picking) return onPick!(mediaPublicUrl(a.id));
    setSelected(a);
    setDraft(a);
    setUsages(null);
    void getAssetUsages(a.id).then(setUsages);
  }

  async function save() {
    if (!draft) return;
    const res = await updateMedia(draft.id, { name: draft.name, altEn: draft.altEn, altAr: draft.altAr, title: draft.title, caption: draft.caption, folderId: draft.folderId });
    showToast(res.ok ? "Saved." : res.error ?? "Could not save.", res.ok ? "success" : "error");
    if (res.ok) await refresh();
  }

  async function remove() {
    if (!selected || !confirm(`Delete "${selected.name}"? This can't be undone.`)) return;
    const res = await deleteMedia(selected.id);
    if (res.ok) {
      showToast("Deleted.");
      setSelected(null);
      setDraft(null);
      await refresh();
    } else {
      showToast(res.error ?? "Could not delete.", "error");
      if (res.usages) setUsages(res.usages);
    }
  }

  async function folderAction(kind: "create" | "rename" | "delete") {
    if (kind === "create") {
      const name = prompt("New folder name");
      if (!name) return;
      const res = await createFolder(name);
      showToast(res.ok ? "Folder created." : res.error ?? "Failed.", res.ok ? "success" : "error");
    } else if (folder && folder !== "none") {
      const current = folders.find((f) => f.id === folder);
      if (kind === "rename") {
        const name = prompt("Rename folder", current?.name ?? "");
        if (!name) return;
        const res = await renameFolder(folder, name);
        showToast(res.ok ? "Folder renamed." : res.error ?? "Failed.", res.ok ? "success" : "error");
      } else {
        if (!confirm(`Delete the empty folder "${current?.name}"?`)) return;
        const res = await deleteFolder(folder);
        showToast(res.ok ? "Folder deleted." : res.error ?? "Failed.", res.ok ? "success" : "error");
        if (res.ok) setFolder("");
      }
    }
    await refresh();
  }

  return (
    <div
      className={`flex flex-col gap-4 ${dragOver ? "rounded-xl outline-2 outline-dashed outline-blue-400" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); void upload(e.dataTransfer.files); }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${inputClassName} max-w-xs`} placeholder="Search name, alt text, caption…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={`${inputClassName} w-auto`} value={folder} onChange={(e) => setFolder(e.target.value)}>
          <option value="">All images</option>
          <option value="none">No folder</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name} ({f.count})</option>
          ))}
        </select>
        {!picking && (
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" checked={unusedOnly} onChange={(e) => setUnusedOnly(e.target.checked)} /> Unused only
          </label>
        )}
        <div className="ml-auto flex items-center gap-3 text-sm">
          {!picking && <button type="button" onClick={() => folderAction("create")} className="font-medium text-slate-600">+ Folder</button>}
          {!picking && folder && folder !== "none" && (
            <>
              <button type="button" onClick={() => folderAction("rename")} className="text-slate-500">Rename</button>
              <button type="button" onClick={() => folderAction("delete")} className="text-red-600">Delete folder</button>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) void upload(e.target.files); e.target.value = ""; }} />
          <button type="button" disabled={!!progress} onClick={() => fileRef.current?.click()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {progress ?? "Upload images"}
          </button>
        </div>
      </div>

      <div className={`grid gap-4 ${selected && !picking ? "lg:grid-cols-[1fr_340px]" : ""}`}>
        <div>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : assets.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
              {search || folder || unusedOnly ? "No images match." : "No images yet. Drop files here or click Upload images."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {assets.map((a) => (
                <button key={a.id} type="button" onClick={() => open(a)} className={`overflow-hidden rounded-xl border bg-white text-left ${selected?.id === a.id ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200 hover:border-blue-300"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaThumb(a.id)} alt={a.altEn || a.name} loading="lazy" className="h-32 w-full bg-slate-100 object-cover" />
                  <div className="p-2">
                    <p className="truncate text-xs font-medium text-slate-800">{a.name}</p>
                    <p className="text-[11px] text-slate-400">{a.width}×{a.height} · {a.kb} KB</p>
                    {!picking && a.usageCount === 0 && <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Unused</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && draft && !picking && (
          <aside className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaThumb(selected.id, 960)} alt="" className="max-h-48 w-full rounded-lg bg-slate-100 object-contain" />
            <p className="text-xs text-slate-400">{selected.width}×{selected.height} · {selected.kb} KB WebP · {selected.createdAt}{selected.uploadedBy ? ` · ${selected.uploadedBy}` : ""}</p>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Name</span><input className={inputClassName} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Alt text (English)</span><input className={inputClassName} value={draft.altEn} onChange={(e) => setDraft({ ...draft, altEn: e.target.value })} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">النص البديل (Arabic)</span><input className={inputClassName} dir="rtl" value={draft.altAr} onChange={(e) => setDraft({ ...draft, altAr: e.target.value })} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Title</span><input className={inputClassName} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Caption</span><textarea className={`${inputClassName} min-h-16`} value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} /></label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Folder</span>
              <select className={inputClassName} value={draft.folderId ?? ""} onChange={(e) => setDraft({ ...draft, folderId: e.target.value || null })}>
                <option value="">No folder</option>
                {folders.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
              </select>
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Save</button>
              <button type="button" onClick={() => { void navigator.clipboard.writeText(mediaPublicUrl(selected.id)); showToast("Link copied."); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">Copy link</button>
              <button type="button" onClick={remove} className="ml-auto text-sm font-medium text-red-600">Delete</button>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Used in</p>
              {usages === null && <p className="text-xs text-slate-400">Checking…</p>}
              {usages?.length === 0 && <p className="text-xs text-slate-400">Nowhere yet — safe to delete.</p>}
              <ul className="flex flex-col gap-1">
                {usages?.map((u, i) => (
                  <li key={i} className="text-xs">
                    <a href={u.href} className="font-medium text-blue-600">{u.source}: {u.label}</a>
                    <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${u.live ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{u.live ? "live" : "draft"}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
