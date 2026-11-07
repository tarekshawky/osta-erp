// Undo / redo for the page editor. The editor keeps the working draft as immutable snapshots, so a history is just two stacks.
// A burst of edits (typing in a field, dragging a colour) counts as ONE step: changes less than `windowMs` apart merge. Anything
// that changes the structure (adding, deleting or reordering blocks) always starts a new step.

export type History<T> = { past: T[]; future: T[]; lastAt: number };

export const MAX_STEPS = 100;
export const MERGE_WINDOW_MS = 800;

export const emptyHistory = <T>(): History<T> => ({ past: [], future: [], lastAt: 0 });

// Call with the draft as it was BEFORE the change. `structural` forces a new step.
export function recordChange<T>(h: History<T>, before: T, now: number, structural: boolean, windowMs = MERGE_WINDOW_MS): History<T> {
  const merge = !structural && h.past.length > 0 && now - h.lastAt < windowMs;
  if (merge) return { ...h, future: [], lastAt: now };
  return { past: [...h.past, before].slice(-MAX_STEPS), future: [], lastAt: now };
}

export function undo<T>(h: History<T>, current: T): { history: History<T>; value: T } | null {
  if (h.past.length === 0) return null;
  const value = h.past[h.past.length - 1];
  // lastAt = 0 so the next edit after an undo is never merged into the step that was just undone.
  return { value, history: { past: h.past.slice(0, -1), future: [...h.future, current], lastAt: 0 } };
}

export function redo<T>(h: History<T>, current: T): { history: History<T>; value: T } | null {
  if (h.future.length === 0) return null;
  const value = h.future[h.future.length - 1];
  return { value, history: { past: [...h.past, current].slice(-MAX_STEPS), future: h.future.slice(0, -1), lastAt: 0 } };
}

// True when the list of block ids (their order or membership) differs, i.e. a block was added, removed, moved or replaced.
export function blocksStructureChanged(before: { id: string }[], after: { id: string }[]): boolean {
  if (before.length !== after.length) return true;
  return before.some((b, i) => b.id !== after[i].id);
}
