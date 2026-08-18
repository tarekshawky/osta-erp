export type CreditCardDetailTab = "transactions" | "statement" | "payments";

export function CreditCardWalletDetail({
  basePath,
  activeTab,
  transactionCount,
  paymentCount,
  transactionsContent,
  statementContent,
  paymentsContent,
}: {
  basePath: string;
  activeTab: CreditCardDetailTab;
  transactionCount: number;
  paymentCount: number;
  transactionsContent: React.ReactNode;
  statementContent: React.ReactNode;
  paymentsContent: React.ReactNode;
}) {
  const tabs: { id: CreditCardDetailTab; label: string }[] = [
    { id: "transactions", label: `Transactions (${transactionCount})` },
    { id: "statement", label: "Monthly Statement" },
    { id: "payments", label: `Payments (${paymentCount})` },
  ];

  return (
    <div>
      <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-1 gap-1">
        {tabs.map((t) => (
          <a
            key={t.id}
            href={`${basePath}?tab=${t.id}`}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              activeTab === t.id ? "bg-blue-700 text-white" : "text-slate-600"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === "transactions" && transactionsContent}
        {activeTab === "statement" && statementContent}
        {activeTab === "payments" && paymentsContent}
      </div>
    </div>
  );
}
