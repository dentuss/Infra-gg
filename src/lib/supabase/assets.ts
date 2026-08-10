import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { assetOrigin } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Client for the shared, read-only board assets: blueprints, gadget icons and
 * the replay decoder. These are byte-identical in every environment and add up
 * to ~755 MB, which will not fit alongside a free project's other data — so
 * staging reads them from production instead of holding its own copy.
 *
 * Deliberately NOT the browser client:
 *
 * - It never carries a session (`persistSession: false`, no auto refresh), so
 *   it cannot act as the signed-in user against a project that is not this
 *   environment's. Every object it touches is world-readable anyway — the
 *   `strategy` bucket's SELECT policy is granted to `public`, and `tools` is a
 *   public bucket — so anonymous access is all it needs.
 * - One instance, not one per call, because each `createClient` spins up its
 *   own fetch and realtime plumbing.
 *
 * Anything that WRITES — thumbnails, `.pptx` import media, avatars — must keep
 * using the normal client. Those belong to the environment, not to the shared
 * asset library.
 */
let cached: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function createAssetClient() {
  cached ??= createSupabaseClient<Database>(assetOrigin.url, assetOrigin.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** True when assets come from a different project than this environment's data. */
export const usesSharedAssets = assetOrigin.shared;
