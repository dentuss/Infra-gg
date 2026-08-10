import { z } from "zod";

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
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_ENV: z.enum(APP_ENVS).default("development"),
});

// NEXT_PUBLIC_ vars must be referenced statically so Next.js can inline them
// into the client bundle.
export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
});

export const appEnv: AppEnv = env.NEXT_PUBLIC_APP_ENV;

/**
 * True only on the live deployment. Staging and production are both
 * `*.vercel.app` and look identical, so this drives the sidebar badge that
 * says which database you are about to write to.
 */
export const isProduction = appEnv === "production";
