/**
 * A Supabase project URL must be a bare origin — `https://<ref>.supabase.co`.
 *
 * The client appends its own path to it (`/auth/v1/token`, `/rest/v1/...`,
 * `/storage/v1/...`), so a value carrying a path silently produces nonsense
 * like `/rest/v1/auth/v1/token`, which PostgREST answers with a 404 and no
 * indication of why. The dashboard offers several copyable URLs and only the
 * plain project URL is the right one, so this is easy to get wrong and hard to
 * diagnose — it cost us a broken staging sign-in.
 */
export function isBareOrigin(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return (
    (parsed.protocol === "https:" || parsed.protocol === "http:") &&
    (parsed.pathname === "" || parsed.pathname === "/") &&
    parsed.search === "" &&
    parsed.hash === ""
  );
}

export const BARE_ORIGIN_MESSAGE =
  "must be the bare project URL with no path — https://<ref>.supabase.co, " +
  "not the REST or auth endpoint";
