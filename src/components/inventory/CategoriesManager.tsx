"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import {
  createCategory,
  renameCategory,
  deactivateCategory,
  reactivateCategory,
  createSubcategory,
  renameSubcategory,
  deactivateSubcategory,
  reactivateSubcategory,
} from "@/app/admin/inventory/categories/actions";

export type SubcategoryRow = { id: string; name: string; status: string };
export type CategoryRow = { id: string; name: string; nameAr: string | null; status: string; subcategories: SubcategoryRow[] };

export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNameAr, setNewNameAr] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNameAr, setEditNameAr] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState("");

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        onSuccess?.();
        showToast("Saved.");
        router.refresh();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{categories.length} categor{categories.length === 1 ? "y" : "ies"}</p>
        {!addMode && (
          <button
            onClick={() => {
              setAddMode(true);
              setNewName("");
              setNewNameAr("");
              setError(null);
            }}
            className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
          >
            + Add Category
          </button>
        )}
      </div>

      {addMode && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4 max-w-md">
          <label className="block text-xs font-medium text-slate-600">Category Name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          />
          <label className="mt-3 block text-xs font-medium text-slate-600">Arabic Name (optional)</label>
          <input
            value={newNameAr}
            onChange={(e) => setNewNameAr(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          />
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          <div className="mt-4 flex gap-3">
            <button onClick={() => setAddMode(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
              Cancel
            </button>
            <button
              disabled={isPending || !newName.trim()}
              onClick={() => run(() => createCategory(newName, newNameAr), () => setAddMode(false))}
              className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Arabic Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Subcategories</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <Fragment key={c.id}>
                <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  {editingId === c.id ? (
                    <td colSpan={5} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                          placeholder="Name"
                        />
                        <input
                          value={editNameAr}
                          onChange={(e) => setEditNameAr(e.target.value)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                          placeholder="Arabic Name"
                        />
                        <button
                          disabled={isPending || !editName.trim()}
                          onClick={() => run(() => renameCategory(c.id, editName, editNameAr), () => setEditingId(null))}
                          className="text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5"
                        >
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-xs font-medium border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5">
                          Cancel
                        </button>
                      </div>
                      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-slate-900 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-slate-600">{c.nameAr ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            c.status === "Active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {c.subcategories.length} {expandedId === c.id ? "▲" : "▼"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingId(c.id);
                              setEditName(c.name);
                              setEditNameAr(c.nameAr ?? "");
                              setError(null);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                          >
                            Edit
                          </button>
                          {c.status === "Active" ? (
                            <button
                              disabled={isPending}
                              onClick={() => run(() => deactivateCategory(c.id))}
                              className="text-red-500 hover:text-red-600 text-xs font-medium"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              disabled={isPending}
                              onClick={() => run(() => reactivateCategory(c.id))}
                              className="text-green-600 hover:text-green-700 text-xs font-medium"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
                {expandedId === c.id && (
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        {c.subcategories.map((s) =>
                          editingSubId === s.id ? (
                            <div key={s.id} className="flex items-center gap-2">
                              <input
                                value={editSubName}
                                onChange={(e) => setEditSubName(e.target.value)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                              />
                              <button
                                disabled={isPending || !editSubName.trim()}
                                onClick={() => run(() => renameSubcategory(s.id, editSubName), () => setEditingSubId(null))}
                                className="text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5"
                              >
                                Save
                              </button>
                              <button onClick={() => setEditingSubId(null)} className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-1.5">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div key={s.id} className="flex items-center justify-between text-sm">
                              <span className={s.status === "Inactive" ? "text-slate-400" : "text-slate-800"}>
                                {s.name} {s.status === "Inactive" && <span className="text-xs">(Inactive)</span>}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingSubId(s.id);
                                    setEditSubName(s.name);
                                    setError(null);
                                  }}
                                  className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                                >
                                  Edit
                                </button>
                                {s.status === "Active" ? (
                                  <button
                                    disabled={isPending}
                                    onClick={() => run(() => deactivateSubcategory(s.id))}
                                    className="text-red-500 hover:text-red-600 text-xs font-medium"
                                  >
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    disabled={isPending}
                                    onClick={() => run(() => reactivateSubcategory(s.id))}
                                    className="text-green-600 hover:text-green-700 text-xs font-medium"
                                  >
                                    Reactivate
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        )}
                        {c.subcategories.length === 0 && <p className="text-sm text-slate-400">No subcategories yet.</p>}
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            value={newSubName}
                            onChange={(e) => setNewSubName(e.target.value)}
                            placeholder="New subcategory name"
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm flex-1 max-w-xs"
                          />
                          <button
                            disabled={isPending || !newSubName.trim()}
                            onClick={() => run(() => createSubcategory(c.id, newSubName), () => setNewSubName(""))}
                            className="text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 py-1.5"
                          >
                            + Add Subcategory
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
