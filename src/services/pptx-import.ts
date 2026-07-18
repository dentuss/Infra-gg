import { createClient } from "@/lib/supabase/client";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
};

/**
 * Upload a parsed deck's media to `strategy/imports/<strategyId>/` and return a
 * map of zip path → public URL. The strategy row must already exist — its owner
 * is what the storage RLS policy checks against the object path.
 */
export async function uploadDeckMedia(
  media: Record<string, Uint8Array>,
  strategyId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<Record<string, string>> {
  const bucket = createClient().storage.from("strategy");
  const entries = Object.entries(media);
  const srcMap: Record<string, string> = {};
  let done = 0;

  for (const [path, bytes] of entries) {
    const fileName = path.split("/").pop() ?? "asset";
    const ext = (fileName.split(".").pop() ?? "").toLowerCase();
    const objectPath = `imports/${strategyId}/${fileName}`;

    const { error } = await bucket.upload(objectPath, bytes, {
      upsert: true,
      contentType: MIME[ext] ?? "application/octet-stream",
    });
    if (error) {
      throw new Error(`Could not upload ${fileName}: ${error.message}`);
    }

    srcMap[path] = bucket.getPublicUrl(objectPath).data.publicUrl;
    onProgress?.(++done, entries.length);
  }

  return srcMap;
}
