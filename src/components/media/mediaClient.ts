export type UploadedAsset = { id: string; name: string; width: number; height: number; url: string };

export const mediaThumb = (id: string, w = 480) => `/api/media/${id}?w=${w}`;
export const mediaPublicUrl = (id: string) => `${window.location.origin}/api/media/${id}`;

export async function uploadImage(file: File, folderId?: string | null): Promise<UploadedAsset> {
  const form = new FormData();
  form.append("file", file);
  if (folderId) form.append("folderId", folderId);
  const res = await fetch("/api/admin/media", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Upload failed.");
  return json.asset as UploadedAsset;
}
