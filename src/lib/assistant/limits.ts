// 30 questions per visitor per 10 minutes. Free to answer, so this only keeps scripts from hammering the database.
export const ASSISTANT_LIMIT = { max: 30, windowMs: 10 * 60_000 };
