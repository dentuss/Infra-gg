import { createClient } from "@/lib/supabase/client";

const THUMBNAIL_PATH = (strategyId: string) => `thumbnails/${strategyId}.png`;

/**
 * Uploads a board snapshot as the strategy's thumbnail. Failures are
 * reported via the return value only — thumbnails are cosmetic and the
 * next autosave retries the upload.
 */
export async function uploadStrategyThumbnail(
  strategyId: string,
  pngDataUrl: string,
): Promise<boolean> {
  const supabase = createClient();
  const blob = await (await fetch(pngDataUrl)).blob();
  const { error } = await supabase.storage
    .from("strategy")
    .upload(THUMBNAIL_PATH(strategyId), blob, {
      upsert: true,
      contentType: "image/png",
    });
  return !error;
}

/** Best effort: an orphaned thumbnail is invisible and gets no retry. */
export async function removeStrategyThumbnail(
  strategyId: string,
): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from("strategy").remove([THUMBNAIL_PATH(strategyId)]);
}

/** Public URL with a cache-buster so replaced thumbnails show up. */
export function strategyThumbnailUrl(
  strategyId: string,
  cacheKey: string,
): string {
  const supabase = createClient();
  const { publicUrl } = supabase.storage
    .from("strategy")
    .getPublicUrl(THUMBNAIL_PATH(strategyId)).data;
  return `${publicUrl}?v=${encodeURIComponent(cacheKey)}`;
}
