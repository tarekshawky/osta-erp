"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { inputClassName } from "@/components/FormField";
import { addCustomerNote } from "@/app/admin/customers/actions";

export function AddCustomerNoteForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!note.trim()) return;
    startTransition(async () => {
      const res = await addCustomerNote(customerId, note);
      if (res.ok) {
        setNote("");
        showToast("Note added.");
        router.refresh();
      } else {
        showToast(res.error ?? "Could not add note.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <label className="text-xs font-medium text-slate-600 mb-1.5 block">Add Internal Note</label>
      <textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Customer prefers evening appointments."
        className={inputClassName}
      />
      <button
        type="button"
        disabled={!note.trim() || isPending}
        onClick={submit}
        className="mt-2 rounded-lg bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-4 py-2"
      >
        {isPending ? "Saving..." : "Add Note"}
      </button>
    </div>
  );
}
