import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// prisma/content.prisma repeats a few models of prisma/schema.prisma (the media library and the audit log) for the second database.
// If one copy changes and the other does not, the two databases would disagree: this test stops that.
const read = (f: string) => readFileSync(new URL(`../../prisma/${f}`, import.meta.url), "utf8");
const block = (src: string, name: string) => src.match(new RegExp(`^model ${name} \\{[\\s\\S]*?^\\}`, "m"))?.[0].replace(/[ \t]+/g, " ").trim();

describe("the content database schema", () => {
  const main = read("schema.prisma"), content = read("content.prisma");
  const MODELS = ["AuditLog", "MediaFolder", "MediaAsset", "MediaVariant"];

  it.each(MODELS)("%s is identical in both schema files", (name) => {
    expect(block(content, name)).toBeTruthy();
    expect(block(content, name)).toBe(block(main, name));
  });

  it("has only those models, so nothing else is created in the second database", () => {
    expect([...content.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]).sort()).toEqual([...MODELS].sort());
  });

  it("points at its own database, and its own generated client", () => {
    expect(content).toContain('url      = env("CONTENT_DATABASE_URL")');
    expect(content).toContain('output   = "../src/generated/prisma-content"');
    expect(main).toContain('url      = env("DATABASE_URL")');
  });

  it("keeps no link to a model of the main database (a link cannot reach across two databases)", () => {
    const others = [...main.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]).filter((n) => !MODELS.includes(n));
    for (const name of MODELS) expect(block(content, name)).not.toMatch(new RegExp(`\\b(${others.join("|")})\\b`));
  });
});
