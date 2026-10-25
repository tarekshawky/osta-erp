// What a customer sees after a job is done: first rate the service, then pay, and only then does the invoice appear.
// Pure so the API and the tests share one rule.

export type FlowInput = {
  status: string;
  review: { rating: number; comment: string | null; createdAt: Date } | null;
  invoice: { number: string; amount: number; status: string; paymentLink: string | null } | null;
};

export type CustomerFlow = {
  // The customer can still rate this job (job done, not rated yet).
  canReview: boolean;
  review: { rating: number; comment: string | null; createdAt: string } | null;
  // Money still to pay. The link stays hidden until the job has been rated.
  payment: { amount: number; link: string | null; locked: boolean } | null;
  // Only a paid invoice is shown to the customer.
  invoice: { number: string; amount: number; status: string } | null;
};

export const isPaid = (status: string) => status.trim().toLowerCase() === "paid";
export const isDone = (status: string) => status === "Done";

export function customerFlow(input: FlowInput): CustomerFlow {
  const reviewed = !!input.review;
  const unpaid = input.invoice && !isPaid(input.invoice.status) ? input.invoice : null;
  return {
    canReview: isDone(input.status) && !reviewed,
    review: input.review ? { rating: input.review.rating, comment: input.review.comment, createdAt: input.review.createdAt.toISOString() } : null,
    payment: unpaid ? { amount: unpaid.amount, link: reviewed ? unpaid.paymentLink : null, locked: !reviewed } : null,
    invoice: input.invoice && isPaid(input.invoice.status) ? { number: input.invoice.number, amount: input.invoice.amount, status: input.invoice.status } : null,
  };
}

export function reviewProblem(rating: unknown, comment: unknown): string | null {
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) return "Choose a rating from 1 to 5 stars.";
  if (comment !== undefined && comment !== null && (typeof comment !== "string" || comment.length > 1000)) return "The comment must be 1000 characters or less.";
  return null;
}
