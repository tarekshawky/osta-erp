import { prisma } from "@/lib/prisma";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { isAiPolicy } from "@/lib/site/technicalFiles";

export function OPTIONS() {
  return corsPreflight();
}

// What the public site serves as robots.txt additions, llms.txt, ads.txt and security.txt. A file that is switched off
// (or empty) is null, so the site answers 404 for it.
export async function GET() {
  const files = await prisma.technicalFile.findMany();
  const by = new Map(files.map((f) => [f.key, f]));
  const on = (key: string) => {
    const f = by.get(key);
    return f && f.enabled && f.content.trim() ? f.content : null;
  };
  const policy = by.get("ai-crawlers")?.content;
  return apiSuccess({
    aiPolicy: isAiPolicy(policy) ? policy : "allow",
    robotsExtra: by.get("robots")?.content ?? "",
    llms: on("llms"),
    ads: on("ads"),
    security: on("security"),
  });
}
