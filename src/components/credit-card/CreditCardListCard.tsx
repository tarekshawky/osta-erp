import Link from "next/link";
import { formatAed } from "@/lib/format";
import { maskCardNumber } from "@/lib/creditCardData";

export type CreditCardRow = {
  id: string;
  name: string;
  cardHolder: string | null;
  lastFour: string;
  creditLimit: number;
  status: string;
  currentUsed: number;
  availableCredit: number;
  thisMonth: number;
  expenseCount: number;
};

export function CreditCardListCard({ card, onEdit }: { card: CreditCardRow; onEdit?: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold text-slate-900">{card.cardHolder || card.name}</div>
          <div className="text-sm text-slate-500 font-mono tracking-wide mt-0.5">{maskCardNumber(card.lastFour)}</div>
        </div>
        <div className="flex items-center gap-2">
          {card.status === "Inactive" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>
          )}
          {onEdit && (
            <button type="button" onClick={onEdit} title="Edit" className="text-blue-600 hover:text-blue-700 p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-slate-400">Credit Limit</div>
          <div className="font-semibold text-slate-900">{formatAed(card.creditLimit)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Used</div>
          <div className="font-semibold text-red-600">{formatAed(card.currentUsed)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Available</div>
          <div className="font-semibold text-green-600">{formatAed(card.availableCredit)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">This Month</div>
          <div className="font-semibold text-slate-900">{formatAed(card.thisMonth)}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">{card.expenseCount} expense{card.expenseCount === 1 ? "" : "s"}</span>
        <Link
          href={`/admin/wallets/credit-cards/${card.id}`}
          className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
        >
          View Wallet
        </Link>
      </div>
    </div>
  );
}
