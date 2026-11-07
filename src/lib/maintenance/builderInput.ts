import { z } from "zod";
import { EXTRA_KINDS, type Needs } from "./builder";

// What the website sends to the Smart Package Builder endpoints. The numbers are re-checked and the price is always worked out again on
// the server: nothing the browser says about money is trusted.
const int = (max: number) => z.number().int().min(0).max(max);

export const NeedsInput = z.object({
  acUnits: int(500).default(0),
  handymanHours: int(500).default(0),
  optionIds: z.array(z.string().max(40)).max(100).default([]),
  extras: z.partialRecord(z.enum(EXTRA_KINDS), int(500)).default({}),
  otherText: z.string().trim().max(1000).default(""),
});

export const EvaluateInput = z.object({
  group: z.string().max(40).regex(/^[a-z0-9-]*$/).default(""),
  selectedId: z.string().min(1).max(40),
  chosenId: z.string().min(1).max(40).optional(),
  needs: NeedsInput,
});

export const SubmitInput = EvaluateInput.extend({
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().max(30).refine((v) => { const d = v.replace(/\D/g, ""); return d.length >= 8 && d.length <= 15; }),
    whatsapp: z.string().trim().max(30).default(""),
    email: z.string().trim().toLowerCase().max(120).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    emirate: z.string().trim().min(1).max(40),
    area: z.string().trim().max(120).default(""),
    address: z.string().trim().max(300).default(""),
  }),
  property: z.object({
    type: z.string().trim().min(1).max(40),
    bedrooms: int(50).default(0),
    bathrooms: int(50).default(0),
    floors: int(200).default(0),
    size: z.number().min(0).max(1_000_000).default(0),
  }),
  notes: z.string().trim().max(1000).default(""),
  activationDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).default(""),
  // The customer pressed "Request a Custom Quotation" (the price is then a request, not a commitment).
  wantsQuote: z.boolean().default(false),
});
export type SubmitInput = z.infer<typeof SubmitInput>;

export const toNeeds = (n: z.infer<typeof NeedsInput>): Needs => ({ acUnits: n.acUnits, handymanHours: n.handymanHours, optionIds: n.optionIds, extras: n.extras, otherText: n.otherText });
