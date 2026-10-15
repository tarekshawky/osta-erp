import { parseBlocks } from "@/lib/cms/blocks";

// The blocks stored on a blog post / service page, or [] when there are none or they are no longer valid
// (an invalid body is never sent to the public site).
export function publicBlocks(raw: unknown) {
  const parsed = parseBlocks(raw ?? []);
  return parsed.ok ? parsed.blocks : [];
}
