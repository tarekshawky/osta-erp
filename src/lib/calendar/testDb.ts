// An in-memory stand-in for the parts of Prisma the calendar uses, shared by the calendar tests. It enforces the same rule as the database's
// exclusion constraint (no two active, non-override periods of a team overlap), so races and double bookings are tested for real.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type R = Record<string, any>;
export const mem = { schedules: [] as R[], entries: [] as R[], events: [] as R[], orders: [] as R[], customers: [] as R[], changes: [] as R[], settings: null as R | null, seq: 0, raceOnce: false };

const overlap = (a: R, b: R) => a.startsAt < b.busyUntil && b.startsAt < a.busyUntil;
const cmp = (value: Date | string | null | undefined, c: R): boolean => {
  if (c.gt !== undefined && !(value != null && value > c.gt)) return false;
  if (c.gte !== undefined && !(value != null && value >= c.gte)) return false;
  if (c.lt !== undefined && !(value != null && value < c.lt)) return false;
  if (c.lte !== undefined && !(value != null && value <= c.lte)) return false;
  if (c.not !== undefined && value === c.not) return false;
  if (c.in !== undefined && !c.in.includes(value)) return false;
  return true;
};
const entryWhere = (e: R, w: R): boolean => Object.entries(w).every(([k, v]) => {
  if (k === "OR") return (v as R[]).some((sub) => entryWhere(e, sub));
  if (v && typeof v === "object" && !(v instanceof Date)) return cmp(e[k], v as R);
  return e[k] === v;
});
const clashes = (next: R, ignoreId?: string) => next.state === "ACTIVE" && !next.override && mem.entries.some((o) => o.id !== ignoreId && o.teamId === next.teamId && o.state === "ACTIVE" && !o.override && overlap(o, next));
const VIOLATION = 'conflicting key value violates exclusion constraint "CalendarEntry_no_overlap"';

export const db: R = {
  team: { findUnique: async ({ where }: R) => (where.id === "t1" || where.id === "t2" ? { id: where.id, name: where.id === "t1" ? "Ajman Team 1" : "Ajman Team 2" } : null) },
  region: { findUnique: async ({ where }: R) => (where.id === "r1" ? { id: "r1", nameEn: "Ajman" } : null) },
  bookableService: { findUnique: async ({ where }: R) => (where.id === "s1" || where.id === "s2" ? { id: where.id } : null) },
  teamSchedule: {
    findUnique: async ({ where }: R) => mem.schedules.find((s) => s.teamId === where.teamId) ?? null,
    findMany: async ({ where }: R) => mem.schedules.filter((s) => where?.active === undefined || s.active === where.active),
    upsert: async ({ where, create, update }: R) => { const i = mem.schedules.findIndex((s) => s.teamId === where.teamId); if (i >= 0) Object.assign(mem.schedules[i], update); else mem.schedules.push({ ...create }); return {}; },
  },
  calendarSettings: { findUnique: async () => mem.settings, upsert: async ({ create, update }: R) => { mem.settings = mem.settings ? { ...mem.settings, ...update } : create; return mem.settings; } },
  calendarEntry: {
    findUnique: async ({ where }: R) => {
      const e = mem.entries.find((x) => (where.id ? x.id === where.id : where.holdKey ? x.holdKey === where.holdKey : x.orderId === where.orderId));
      return e ? { ...e } : null;
    },
    findMany: async ({ where }: R) => { if (mem.raceOnce) { mem.raceOnce = false; return []; } return mem.entries.filter((e) => entryWhere(e, where)).map((e) => ({ ...e })); },
    // The database's own protection against overlapping periods.
    create: async ({ data }: R) => {
      const e = { id: `e${++mem.seq}`, state: "ACTIVE", override: false, reason: "", notes: "", area: "", quantity: null, orderId: null, expiresAt: null, holdKey: null, heldByCustomerId: null, ...data };
      if (clashes(e)) throw new Error(VIOLATION);
      mem.entries.push(e);
      return { ...e };
    },
    update: async ({ where, data }: R) => {
      const e = mem.entries.find((x) => x.id === where.id)!;
      if (clashes({ ...e, ...data }, e.id)) throw new Error(VIOLATION);
      Object.assign(e, data);
      return { ...e };
    },
    updateMany: async ({ where, data }: R) => { const hit = mem.entries.filter((e) => entryWhere(e, where)); hit.forEach((e) => Object.assign(e, data)); return { count: hit.length }; },
  },
  calendarEvent: { create: async ({ data }: R) => { mem.events.push({ ...data, createdAt: new Date() }); return data; }, findMany: async ({ where }: R) => mem.events.filter((e) => e.entryId === where.entryId) },
  order: {
    findUnique: async ({ where }: R) => { const o = mem.orders.find((x) => x.id === where.id); return o ? { ...o } : null; },
    findMany: async ({ where }: R) => mem.orders.filter((o) => (!where.teamId || where.teamId.in.includes(o.teamId)) && o.scheduledAt && o.status !== "Cancelled" && !mem.entries.some((e) => e.orderId === o.id)),
    create: async ({ data }: R) => { const o = { id: `o${++mem.seq}`, ...data }; mem.orders.push(o); return o; },
    update: async ({ where, data }: R) => { const o = mem.orders.find((x) => x.id === where.id)!; Object.assign(o, data); return o; },
  },
  orderStatusChange: { create: async ({ data }: R) => { mem.changes.push(data); return data; } },
  $queryRaw: async () => [],
};
db.$transaction = async (cb: (tx: unknown) => unknown) => cb(db);
