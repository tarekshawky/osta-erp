"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { CreditCardForm, type CreditCardFormValue } from "./CreditCardForm";
import { CreditCardListCard, type CreditCardRow } from "./CreditCardListCard";
import { createCreditCard, updateCreditCard, type CreditCardFormInput } from "@/app/admin/wallets/credit-cards/actions";

const emptyFormValue: CreditCardFormValue = {
  name: "",
  cardNumber: "",
  lastFour: "",
  creditLimit: 0,
  billingCycle: "",
  paymentDueDate: "",
  cardHolder: "",
  status: "Active",
  notes: "",
};

function toFormValue(card: CreditCardRow & { billingCycle: string | null; paymentDueDate: number | null; notes: string | null }): CreditCardFormValue {
  return {
    name: card.name,
    cardNumber: "",
    lastFour: card.lastFour,
    creditLimit: card.creditLimit,
    billingCycle: card.billingCycle ?? "",
    paymentDueDate: card.paymentDueDate ? String(card.paymentDueDate) : "",
    cardHolder: card.cardHolder ?? "",
    status: card.status,
    notes: card.notes ?? "",
  };
}

export type CreditCardManagerRow = CreditCardRow & {
  billingCycle: string | null;
  paymentDueDate: number | null;
  notes: string | null;
};

export function CreditCardsManager({ cards }: { cards: CreditCardManagerRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setMode("add");
  }

  function openEdit(id: string) {
    setEditingId(id);
    setMode("edit");
  }

  function close() {
    setMode("closed");
    setEditingId(null);
  }

  async function handleSave(value: CreditCardFormInput) {
    const res = mode === "edit" && editingId ? await updateCreditCard(editingId, value) : await createCreditCard(value);
    if (res.ok) {
      showToast(mode === "edit" ? "Credit card updated." : "Credit card added.");
      close();
      router.refresh();
    }
    return res;
  }

  const editingCard = editingId ? cards.find((c) => c.id === editingId) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{cards.length} card(s)</p>
        {mode === "closed" && (
          <button
            type="button"
            onClick={openAdd}
            className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
          >
            + Add Credit Card
          </button>
        )}
      </div>

      {mode === "add" && <CreditCardForm initial={emptyFormValue} isEdit={false} onSave={handleSave} onCancel={close} />}
      {mode === "edit" && editingCard && (
        <CreditCardForm initial={toFormValue(editingCard)} isEdit onSave={handleSave} onCancel={close} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cards.map((card) => (
          <CreditCardListCard key={card.id} card={card} onEdit={() => openEdit(card.id)} />
        ))}
        {cards.length === 0 && (
          <p className="text-sm text-slate-400 py-10 text-center col-span-2">No credit cards added yet.</p>
        )}
      </div>
    </div>
  );
}
