// Arabic counts with the right grammar: عامل / عاملان / 3 عمال / 11 عاملًا, يوم / يومان / 3 أيام / 11 يومًا.

type Forms = { one: string; two: string; few: string; many: string };

function pick(n: number, f: Forms): string {
  if (n === 1) return f.one;
  if (n === 2) return f.two;
  if (n >= 3 && n <= 10) return `${n} ${f.few}`;
  return `${n} ${f.many}`;
}

const WORKERS: Forms = { one: "عامل واحد", two: "عاملان", few: "عمال", many: "عاملًا" };
const DAYS: Forms = { one: "يوم واحد", two: "يومان", few: "أيام", many: "يومًا" };

export const arWorkers = (n: number) => pick(n, WORKERS);
export const arDays = (n: number) => pick(n, DAYS);

export const enWorkers = (n: number) => `${n} ${n === 1 ? "worker" : "workers"}`;
export const enDays = (n: number) => `${n} ${n === 1 ? "working day" : "working days"}`;
