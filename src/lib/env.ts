import { z } from "zod";

import { resolveAssetOrigin } from "@/lib/asset-origin";
import { BARE_ORIGIN_MESSAGE, isBareOrigin } from "@/lib/supabase-url";

/**
 * Which deployment this build is. Vercel sets VERCEL_ENV per environment but
 * does not expose it to the browser, so it is mirrored into a NEXT_PUBLIC_
 * variable at build time (see .env.example).
 *
 * - production — master, the live app on real team data
 * - preview — dev and pull-request deploys, pointed at the dev database
 * - development — a local `npm run dev`
 */
export const APP_ENVS = ["production", "preview", "development"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url().refine(isBareOrigin, BARE_ORIGIN_MESSAGE),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_ENV: z.enum(APP_ENVS).default("development"),

  // Where the shared, read-only board assets live — blueprints, gadget icons
  // and the replay decoder. Optional: unset means "the same project as
  // everything else", which is what production and a normal local setup want.
  // Staging points these at production so it does not need its own 755 MB copy
  // of the blueprints, which would not fit in a free project anyway.
  NEXT_PUBLIC_ASSET_SUPABASE_URL: z
    .url()
    .refine(isBareOrigin, BARE_ORIGIN_MESSAGE)
    .optional(),
  NEXT_PUBLIC_ASSET_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
});

// NEXT_PUBLIC_ vars must be referenced statically so Next.js can inline them
// into the client bundle.
export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_ASSET_SUPABASE_URL:
    process.env.NEXT_PUBLIC_ASSET_SUPABASE_URL || undefined,
  NEXT_PUBLIC_ASSET_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_ASSET_SUPABASE_PUBLISHABLE_KEY || undefined,
});

export const appEnv: AppEnv = env.NEXT_PUBLIC_APP_ENV;

/**
 * True only on the live deployment. Staging and production are both
 * `*.vercel.app` and look identical, so this drives the sidebar badge that
 * says which database you are about to write to.
 */
export const isProduction = appEnv === "production";

export const assetOrigin = resolveAssetOrigin(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  env.NEXT_PUBLIC_ASSET_SUPABASE_URL,
  env.NEXT_PUBLIC_ASSET_SUPABASE_PUBLISHABLE_KEY,
);
