/**
 * Which build is running. The version comes from package.json at build time and
 * the commit from Vercel; both are baked in by next.config.ts.
 *
 * Deliberately not in `env.ts`: these are informational, always present with a
 * sane fallback, and should never be able to fail a build the way a missing
 * Supabase URL should.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0";
export const COMMIT_SHA = process.env.NEXT_PUBLIC_COMMIT_SHA || "";

/** Seven characters, the length git itself abbreviates to. */
export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

/** "v0.5.0" locally, "v0.5.0 · a1b2c3d" once deployed. */
export function buildLabel(version: string, sha: string): string {
  const short = shortSha(sha);
  return short ? `v${version} · ${short}` : `v${version}`;
}
