import { describe, it, expect } from "vitest";
import { SERVICE_NOTE_MAX } from "./serviceNote";

describe("service note", () => {
  it("allows a generous but bounded note", () => {
    expect(SERVICE_NOTE_MAX).toBeGreaterThanOrEqual(300);
    expect(SERVICE_NOTE_MAX).toBeLessThanOrEqual(2000);
  });
});
