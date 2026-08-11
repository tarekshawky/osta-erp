"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { advanceOrderStatus } from "@/app/admin/orders/actions";
import { STATUS_ACTION_LABEL, type OrderStatus } from "@/lib/orderData";

export function OrderStatusButton({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const label = STATUS_ACTION_LABEL[status];
  if (!label) return null;

  function handleClick() {
    startTransition(async () => {
      const res = await advanceOrderStatus(orderId);
      if (res.ok) {
        router.refresh();
        showToast("Order updated.");
      } else {
        showToast(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="w-full rounded-xl bg-blue-700 disabled:opacity-60 text-white font-medium text-sm py-3.5"
    >
      {isPending ? "Updating..." : label}
    </button>
  );
}
