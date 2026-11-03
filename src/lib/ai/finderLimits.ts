// Limits for the public AI service finder, so one visitor (or a script) cannot run up the bill.
export const PER_VISITOR = { max: 6, windowMs: 10 * 60_000 };
export const DEFAULT_DAILY_CAP = 300;

export const dailyCap = (env: string | undefined = process.env.AI_FINDER_DAILY_CAP) => {
  const n = Number(env);
  return env !== undefined && env.trim() !== "" && Number.isInteger(n) && n >= 0 ? n : DEFAULT_DAILY_CAP;
};

export type Decision = "ok" | "visitor_limit" | "daily_cap";
export const decide = (visitorRecent: number, todayTotal: number, cap: number): Decision =>
  todayTotal >= cap ? "daily_cap" : visitorRecent >= PER_VISITOR.max ? "visitor_limit" : "ok";
