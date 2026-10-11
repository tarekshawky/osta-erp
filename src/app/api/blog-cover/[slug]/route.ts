import { prisma } from "@/lib/prisma";
import { parseImageDataUri } from "@/lib/blogCover";

// Public image for a published post whose cover is stored inline. Cached hard: the URL carries a content hash (?v=).
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({ where: { slug, published: true }, select: { coverImageUrl: true } });
  const image = parseImageDataUri(post?.coverImageUrl);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image.bytes), {
    headers: { "Content-Type": image.mime, "Cache-Control": "public, max-age=31536000, immutable", "Access-Control-Allow-Origin": "*" },
  });
}
